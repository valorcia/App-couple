import { Injectable } from '@nestjs/common';
import { type GameType, Prisma } from '@couple/database';
import { AppError, ErrorCode } from '@couple/shared';
import {
  type AnswerPayload,
  type RoundPrompt,
  type RoundResult,
  type RoundState,
  SESSION_LENGTHS,
  type Verdict,
  assignSubjects,
  canReveal,
  funLine,
  isRoundClosed,
  isSessionComplete,
  nextOpenRoundIndex,
  pickRandom,
  summarizeRound,
  summarizeSession,
  validateAnswer,
} from '@couple/game-engine';
import type { DailyQuestionDto, GameCatalogDto, GameRoundDto, GameSessionDto, GameSessionListItemDto } from '@couple/types';
import type { CreateGameSessionInput } from '@couple/validation';
import { PrismaService } from '@/common/prisma/prisma.service';
import { SettingsService } from '@/common/settings/settings.service';
import type { CoupleContext } from '@/common/decorators/auth.decorators';
import { EntitlementsService } from '@/modules/entitlements/entitlements.service';
import { RealtimeGateway } from '@/modules/realtime/realtime.gateway';
import { NotificationsService } from '@/modules/notifications/notifications.service';

interface Viewer {
  userId: string;
  couple: CoupleContext;
}

const sessionInclude = {
  participants: { select: { userId: true } },
  rounds: { orderBy: { index: 'asc' }, include: { answers: true } },
} satisfies Prisma.GameSessionInclude;
type SessionRow = Prisma.GameSessionGetPayload<{ include: typeof sessionInclude }>;
type RoundRow = SessionRow['rounds'][number];

const SESSION_GAMES: GameType[] = ['SECRET_ANSWERS', 'WHO_KNOWS_BEST', 'DILEMMA', 'WHICH_OF_US', 'CONFESSIONS'];
const RECENT_DAYS = 60;

/**
 * Jeux de couple. Invariant : la réponse d'un partenaire n'est jamais sérialisée pour l'autre
 * avant `GameRound.revealedAt` (posé en transaction lorsque les deux ont répondu).
 */
@Injectable()
export class GamesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
    private readonly entitlements: EntitlementsService,
    private readonly realtime: RealtimeGateway,
    private readonly notifications: NotificationsService,
  ) {}

  // ------------------------------------------------------------------ catalogue
  async catalog(viewer: Viewer, locale: string): Promise<GameCatalogDto> {
    const premium = await this.entitlements.isPremium(viewer.couple.coupleId);
    const freeCategories = new Set(await this.settings.get('games.freeCategories'));
    const categories = await this.prisma.contentCategory.findMany({ where: { status: 'PUBLISHED' }, orderBy: { sortOrder: 'asc' } });
    const counts = await this.prisma.question.groupBy({
      by: ['gameType', 'categoryId'],
      where: { status: 'PUBLISHED', locale, ...(premium ? {} : { tier: 'FREE' }) },
      _count: { _all: true },
    });
    const games = SESSION_GAMES.map((gameType) => {
      const cats = categories
        .filter((c) => c.gameTypes.includes(gameType))
        .map((c) => ({
          code: c.code,
          name: c.name,
          description: c.description,
          icon: c.icon,
          questionCount: counts.find((x) => x.gameType === gameType && x.categoryId === c.id)?._count._all ?? 0,
          locked: !premium && !freeCategories.has(c.code),
        }))
        .filter((c) => c.questionCount > 0);
      return { gameType, available: cats.length > 0, categories: cats, totalQuestions: cats.reduce((n, c) => n + c.questionCount, 0) };
    });
    const sessionsLeftToday = premium ? null : await this.sessionsLeftToday(viewer.couple.coupleId);
    return { games, premium, sessionsLeftToday };
  }

  private async sessionsLeftToday(coupleId: string): Promise<number> {
    const quota = await this.settings.get('quota.free.gameSessionsPerDay');
    const since = new Date(Date.now() - 86_400_000);
    const used = await this.prisma.gameSession.count({ where: { coupleId, createdAt: { gt: since } } });
    return Math.max(0, quota - used);
  }

  // ------------------------------------------------------------------ sessions
  async createSession(viewer: Viewer, input: CreateGameSessionInput, locale: string): Promise<GameSessionDto> {
    const partnerId = viewer.couple.partnerUserId;
    if (!partnerId) throw new AppError(ErrorCode.COUPLE_REQUIRED, "Associez d'abord votre partenaire.", 403);
    const premium = await this.entitlements.isPremium(viewer.couple.coupleId);
    if (!premium && (await this.sessionsLeftToday(viewer.couple.coupleId)) <= 0) {
      throw new AppError(ErrorCode.QUOTA_EXCEEDED, "Vous avez atteint votre quota de parties pour aujourd'hui.", 402, { upgrade: 'premium' });
    }
    const freeCategories = new Set(await this.settings.get('games.freeCategories'));
    const categoryCodes = input.categoryCodes.length ? input.categoryCodes : null;
    if (!premium && categoryCodes?.some((c) => !freeCategories.has(c))) {
      throw new AppError(ErrorCode.ENTITLEMENT_REQUIRED, 'Cette catégorie est réservée à Premium.', 402, { required: 'premium' });
    }

    const where: Prisma.QuestionWhereInput = {
      gameType: input.gameType,
      status: 'PUBLISHED',
      locale,
      ...(premium ? {} : { tier: 'FREE' }),
      ...(input.gameType === 'CONFESSIONS' ? { level: { lte: input.maxLevel } } : {}),
      category: categoryCodes ? { code: { in: categoryCodes } } : premium ? undefined : { code: { in: [...freeCategories] } },
    };
    const pool = await this.prisma.question.findMany({ where, include: { category: { select: { code: true } } } });
    if (pool.length === 0) throw new AppError(ErrorCode.NOT_FOUND, 'Aucune question disponible pour ces critères.', 404);

    const recent = await this.prisma.gameRound.findMany({
      where: { session: { coupleId: viewer.couple.coupleId, createdAt: { gt: new Date(Date.now() - RECENT_DAYS * 86_400_000) } }, questionId: { not: null } },
      select: { questionId: true },
    });
    const count = Math.min(SESSION_LENGTHS[input.length], pool.length);
    const picked = pickRandom(pool, count, new Set(recent.map((r) => r.questionId!)));
    const participants = [viewer.userId, partnerId];
    const subjects = input.gameType === 'WHO_KNOWS_BEST' ? assignSubjects(count, participants, Math.round(Math.random())) : null;

    const session = await this.prisma.gameSession.create({
      data: {
        coupleId: viewer.couple.coupleId,
        createdByUserId: viewer.userId,
        gameType: input.gameType,
        config: { categoryCodes: input.categoryCodes, length: input.length, maxLevel: input.maxLevel } as Prisma.InputJsonValue,
        participants: { create: participants.map((userId) => ({ userId })) },
        rounds: {
          create: picked.map((q, index) => {
            const payload = (q.payload ?? {}) as { options?: string[] };
            const prompt: RoundPrompt = { text: q.text, categoryCode: q.category?.code ?? null, level: q.level };
            if (q.gameType === 'DILEMMA' && payload.options) prompt.options = payload.options;
            if (subjects) prompt.subjectUserId = subjects[index]!;
            return { index, questionId: q.id, prompt: prompt as unknown as Prisma.InputJsonValue };
          }),
        },
      },
      include: sessionInclude,
    });
    this.realtime.emitToCouple(viewer.couple.coupleId, 'game.changed', { sessionId: session.id, action: 'created' });
    await this.notifications.notify({ userId: partnerId, category: 'GAME', type: 'game.invited', title: 'Une partie vous attend', body: 'Votre partenaire a lancé un jeu à deux.', data: { sessionId: session.id } });
    return this.toDto(session, viewer);
  }

  async listSessions(viewer: Viewer, status?: 'OPEN' | 'COMPLETED' | 'ABANDONED', limit = 20, cursor?: string): Promise<{ items: GameSessionListItemDto[]; nextCursor: string | null }> {
    const rows = await this.prisma.gameSession.findMany({
      where: { coupleId: viewer.couple.coupleId, ...(status ? { status } : {}) },
      orderBy: { id: 'desc' },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: sessionInclude,
    });
    const hasMore = rows.length > limit;
    const items = rows.slice(0, limit).map((s) => {
      const rounds = s.rounds.map((r) => this.toRoundState(r));
      const open = rounds.find((r) => !isRoundClosed(r));
      return {
        id: s.id,
        gameType: s.gameType,
        status: s.status,
        roundsTotal: rounds.length,
        roundsClosed: rounds.filter(isRoundClosed).length,
        myTurn: s.status === 'OPEN' && !!open && open.answers[viewer.userId] === undefined,
        createdAt: s.createdAt.toISOString(),
        completedAt: s.completedAt?.toISOString() ?? null,
      };
    });
    return { items, nextCursor: hasMore ? items[items.length - 1]!.id : null };
  }

  async getSession(viewer: Viewer, id: string): Promise<GameSessionDto> {
    const session = await this.requireSession(viewer, id);
    return this.toDto(session, viewer);
  }

  async answer(viewer: Viewer, sessionId: string, index: number, answer: AnswerPayload): Promise<GameSessionDto> {
    const session = await this.requireSession(viewer, sessionId);
    if (session.status !== 'OPEN') throw new AppError(ErrorCode.GAME_SESSION_CLOSED, 'Cette partie est terminée.', 409);
    const round = session.rounds.find((r) => r.index === index);
    if (!round) throw AppError.notFound('Manche introuvable.');
    const state = this.toRoundState(round);
    if (isRoundClosed(state)) throw new AppError(ErrorCode.GAME_ALREADY_ANSWERED, 'Cette manche est déjà close.', 409);
    const participantIds = session.participants.map((p) => p.userId);
    const error = validateAnswer(session.gameType, state, answer, participantIds, viewer.userId);
    if (error) throw new AppError(ErrorCode.VALIDATION_FAILED, error, 400);

    await this.prisma.$transaction(async (tx) => {
      // Verrou sur la manche pour éviter une double révélation concurrente.
      await tx.$queryRaw`SELECT id FROM "GameRound" WHERE id = ${round.id}::uuid FOR UPDATE`;
      await tx.answer.upsert({
        where: { roundId_userId: { roundId: round.id, userId: viewer.userId } },
        create: { roundId: round.id, userId: viewer.userId, payload: answer as unknown as Prisma.InputJsonValue },
        update: { payload: answer as unknown as Prisma.InputJsonValue },
      });
      const answers = await tx.answer.findMany({ where: { roundId: round.id } });
      const nextState: RoundState = { ...state, answers: Object.fromEntries(answers.map((a) => [a.userId, a.payload as unknown as AnswerPayload])) };
      if (canReveal(nextState, participantIds)) {
        await tx.gameRound.update({ where: { id: round.id }, data: { revealedAt: new Date() } });
      }
    });
    return this.afterChange(viewer, sessionId, 'answered');
  }

  async skip(viewer: Viewer, sessionId: string, index: number): Promise<GameSessionDto> {
    const session = await this.requireSession(viewer, sessionId);
    if (session.status !== 'OPEN') throw new AppError(ErrorCode.GAME_SESSION_CLOSED, 'Cette partie est terminée.', 409);
    const round = session.rounds.find((r) => r.index === index);
    if (!round) throw AppError.notFound('Manche introuvable.');
    if (isRoundClosed(this.toRoundState(round))) throw new AppError(ErrorCode.GAME_ALREADY_ANSWERED, 'Cette manche est déjà close.', 409);
    const result: RoundResult = { skipped: true, skippedByUserId: viewer.userId };
    await this.prisma.$transaction([
      // Les réponses déjà saisies sur une manche passée sont supprimées : rien n'est révélé.
      this.prisma.answer.deleteMany({ where: { roundId: round.id } }),
      this.prisma.gameRound.update({ where: { id: round.id }, data: { result: result as unknown as Prisma.InputJsonValue } }),
    ]);
    return this.afterChange(viewer, sessionId, 'skipped');
  }

  async verdict(viewer: Viewer, sessionId: string, index: number, verdict: Verdict): Promise<GameSessionDto> {
    const session = await this.requireSession(viewer, sessionId);
    if (session.gameType !== 'WHO_KNOWS_BEST') throw new AppError(ErrorCode.VALIDATION_FAILED, 'Pas de verdict pour ce jeu.', 400);
    const round = session.rounds.find((r) => r.index === index);
    if (!round || !round.revealedAt) throw new AppError(ErrorCode.GAME_NOT_REVEALED, 'En attente de la réponse de votre partenaire.', 409);
    const prompt = round.prompt as unknown as RoundPrompt;
    if (prompt.subjectUserId !== viewer.userId) throw AppError.forbidden('Seule la personne concernée peut donner le verdict.');
    const current = (round.result ?? {}) as RoundResult;
    await this.prisma.gameRound.update({ where: { id: round.id }, data: { result: { ...current, verdict } as unknown as Prisma.InputJsonValue } });
    return this.afterChange(viewer, sessionId, 'verdict');
  }

  async abandon(viewer: Viewer, sessionId: string): Promise<void> {
    const session = await this.requireSession(viewer, sessionId);
    if (session.status !== 'OPEN') return;
    await this.prisma.gameSession.update({ where: { id: sessionId }, data: { status: 'ABANDONED', completedAt: new Date() } });
    this.realtime.emitToCouple(viewer.couple.coupleId, 'game.changed', { sessionId, action: 'abandoned' });
  }

  // ------------------------------------------------------------------ question du jour
  async daily(viewer: Viewer, locale: string): Promise<DailyQuestionDto | null> {
    const today = dateOnly(new Date());
    let row = await this.prisma.dailyQuestion.findUnique({ where: { coupleId_date: { coupleId: viewer.couple.coupleId, date: today } }, include: { question: { include: { category: true } }, answers: true } });
    if (!row) {
      const premium = await this.entitlements.isPremium(viewer.couple.coupleId);
      const recent = await this.prisma.dailyQuestion.findMany({ where: { coupleId: viewer.couple.coupleId, date: { gt: new Date(Date.now() - 180 * 86_400_000) } }, select: { questionId: true } });
      const pool = await this.prisma.question.findMany({ where: { gameType: 'SECRET_ANSWERS', status: 'PUBLISHED', locale, ...(premium ? {} : { tier: 'FREE' }) } });
      const [picked] = pickRandom(pool, 1, new Set(recent.map((r) => r.questionId)));
      if (!picked) return null;
      try {
        row = await this.prisma.dailyQuestion.create({ data: { coupleId: viewer.couple.coupleId, date: today, questionId: picked.id }, include: { question: { include: { category: true } }, answers: true } });
      } catch (e) {
        // Création concurrente par le partenaire : on relit.
        if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002')) throw e;
        row = await this.prisma.dailyQuestion.findUniqueOrThrow({ where: { coupleId_date: { coupleId: viewer.couple.coupleId, date: today } }, include: { question: { include: { category: true } }, answers: true } });
      }
    }
    return this.toDailyDto(row, viewer);
  }

  async answerDaily(viewer: Viewer, text: string, locale: string): Promise<DailyQuestionDto> {
    const current = await this.daily(viewer, locale);
    if (!current) throw new AppError(ErrorCode.NOT_FOUND, 'Aucune question du jour disponible.', 404);
    if (current.revealedAt) throw new AppError(ErrorCode.GAME_ALREADY_ANSWERED, 'La question du jour est déjà révélée.', 409);
    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "DailyQuestion" WHERE id = ${current.id}::uuid FOR UPDATE`;
      await tx.dailyQuestionAnswer.upsert({
        where: { dailyQuestionId_userId: { dailyQuestionId: current.id, userId: viewer.userId } },
        create: { dailyQuestionId: current.id, userId: viewer.userId, text },
        update: { text },
      });
      const count = await tx.dailyQuestionAnswer.count({ where: { dailyQuestionId: current.id } });
      if (count >= 2) await tx.dailyQuestion.update({ where: { id: current.id }, data: { revealedAt: new Date() } });
    });
    this.realtime.emitToCouple(viewer.couple.coupleId, 'daily.changed', { id: current.id });
    const updated = await this.daily(viewer, locale);
    if (viewer.couple.partnerUserId && !updated?.revealedAt) {
      await this.notifications.notify({ userId: viewer.couple.partnerUserId, category: 'DAILY_QUESTION', type: 'daily.partner_answered', title: 'Question du jour', body: 'Votre partenaire a répondu. À vous !', data: { dailyQuestionId: current.id } });
    }
    return updated!;
  }

  // ------------------------------------------------------------------ internes
  private async afterChange(viewer: Viewer, sessionId: string, action: string): Promise<GameSessionDto> {
    let session = await this.requireSession(viewer, sessionId);
    const participantIds = session.participants.map((p) => p.userId);
    const rounds = session.rounds.map((r) => this.toRoundState(r));
    const needsVerdict = session.gameType === 'WHO_KNOWS_BEST' && rounds.some((r) => r.revealedAt && !r.result?.skipped && !r.result?.verdict);
    if (session.status === 'OPEN' && isSessionComplete(rounds) && !needsVerdict) {
      const summary = summarizeSession(session.gameType, rounds, participantIds);
      session = await this.prisma.gameSession.update({ where: { id: sessionId }, data: { status: 'COMPLETED', completedAt: new Date(), summary: summary as unknown as Prisma.InputJsonValue }, include: sessionInclude });
    }
    this.realtime.emitToCouple(viewer.couple.coupleId, 'game.changed', { sessionId, action });
    const partnerId = viewer.couple.partnerUserId;
    if (partnerId && action === 'answered') {
      const open = nextOpenRoundIndex(rounds);
      const openRound = open !== null ? rounds[open] : undefined;
      if (openRound && openRound.answers[partnerId] === undefined && openRound.answers[viewer.userId] !== undefined) {
        await this.notifications.notify({ userId: partnerId, category: 'GAME', type: 'game.your_turn', title: 'À vous de jouer', body: 'Votre partenaire a répondu.', data: { sessionId } });
      }
    }
    return this.toDto(session, viewer);
  }

  private async requireSession(viewer: Viewer, id: string): Promise<SessionRow> {
    const session = await this.prisma.gameSession.findFirst({ where: { id, coupleId: viewer.couple.coupleId }, include: sessionInclude });
    if (!session || !session.participants.some((p) => p.userId === viewer.userId)) throw AppError.notFound('Partie introuvable.');
    return session;
  }

  private toRoundState(r: RoundRow): RoundState {
    return {
      index: r.index,
      prompt: r.prompt as unknown as RoundPrompt,
      answers: Object.fromEntries(r.answers.map((a) => [a.userId, a.payload as unknown as AnswerPayload])),
      revealedAt: r.revealedAt,
      result: (r.result as RoundResult | null) ?? null,
    };
  }

  private toDto(session: SessionRow, viewer: Viewer): GameSessionDto {
    const participantIds = session.participants.map((p) => p.userId);
    const partnerId = participantIds.find((id) => id !== viewer.userId) ?? null;
    const states = session.rounds.map((r) => this.toRoundState(r));
    const rounds: GameRoundDto[] = states.map((s) => {
      const revealed = s.revealedAt !== null;
      const summary = revealed || s.result?.skipped ? summarizeRound(session.gameType, s, participantIds) : null;
      const awaitingVerdict = session.gameType === 'WHO_KNOWS_BEST' && revealed && !s.result?.verdict ? (s.prompt.subjectUserId ?? null) : null;
      return {
        index: s.index,
        prompt: s.prompt,
        myAnswer: s.answers[viewer.userId] ?? null,
        partnerAnswered: partnerId ? s.answers[partnerId] !== undefined : false,
        revealedAt: s.revealedAt?.toISOString() ?? null,
        // Invariant de confidentialité : jamais la réponse du partenaire avant révélation.
        partnerAnswer: revealed && partnerId ? (s.answers[partnerId] ?? null) : null,
        skipped: s.result?.skipped === true,
        verdict: s.result?.verdict ?? null,
        awaitingVerdictFrom: awaitingVerdict,
        funLine: summary ? funLine(session.gameType, summary, {}) : null,
      };
    });
    return {
      id: session.id,
      gameType: session.gameType,
      status: session.status,
      createdByUserId: session.createdByUserId,
      participantIds,
      rounds,
      currentRoundIndex: session.status === 'OPEN' ? nextOpenRoundIndex(states) : null,
      summary: (session.summary as Record<string, unknown> | null) ?? null,
      createdAt: session.createdAt.toISOString(),
      completedAt: session.completedAt?.toISOString() ?? null,
    };
  }

  private toDailyDto(row: Prisma.DailyQuestionGetPayload<{ include: { question: { include: { category: true } }; answers: true } }>, viewer: Viewer): DailyQuestionDto {
    const mine = row.answers.find((a) => a.userId === viewer.userId);
    const partner = row.answers.find((a) => a.userId !== viewer.userId);
    const revealed = !!row.revealedAt;
    return {
      id: row.id,
      date: row.date.toISOString().slice(0, 10),
      text: row.question.text,
      categoryCode: row.question.category?.code ?? null,
      myAnswer: mine?.text ?? null,
      partnerAnswered: !!partner,
      revealedAt: row.revealedAt?.toISOString() ?? null,
      partnerAnswer: revealed ? (partner?.text ?? null) : null,
    };
  }
}

function dateOnly(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}
