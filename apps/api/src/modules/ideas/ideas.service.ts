import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { Prisma } from '@couple/database';
import { AppError, ErrorCode } from '@couple/shared';
import type { IdeaDto, IdeaSuggestionsDto, ScheduledIdeaDto } from '@couple/types';
import type { SuggestIdeasInput } from '@couple/validation';
import type { scheduleIdeaSchema } from '@couple/validation';
import { PrismaService } from '@/common/prisma/prisma.service';
import { SettingsService } from '@/common/settings/settings.service';
import { AiService } from '@/common/ai/ai.service';
import type { CoupleContext } from '@/common/decorators/auth.decorators';
import { CalendarService } from '@/modules/calendar/calendar.service';
import { EntitlementsService } from '@/modules/entitlements/entitlements.service';

interface Viewer {
  userId: string;
  couple: CoupleContext;
}

const aiIdeasSchema = z.object({
  ideas: z.array(z.object({
    title: z.string().min(2).max(80),
    description: z.string().min(10).max(400),
    budget: z.enum(['FREE', 'LOW', 'MEDIUM', 'HIGH']),
    durationMinutes: z.number().int().min(15).max(1440).nullable(),
    indoor: z.boolean().nullable(),
  })).min(1).max(3),
});

const BUDGET_ORDER = { FREE: 0, LOW: 1, MEDIUM: 2, HIGH: 3 } as const;

/**
 * « On fait quoi ? » : propositions issues du catalogue (toujours), enrichies par l'IA quand elle
 * est disponible et dans le quota. Jamais de faux résultat IA ; l'ajout à l'agenda est une action
 * explicite distincte.
 */
@Injectable()
export class IdeasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
    private readonly ai: AiService,
    private readonly calendar: CalendarService,
    private readonly entitlements: EntitlementsService,
  ) {}

  async suggest(viewer: Viewer, input: SuggestIdeasInput, locale: string, timezone: string): Promise<IdeaSuggestionsDto> {
    const premium = await this.entitlements.isPremium(viewer.couple.coupleId);
    const done = await this.prisma.experience.findMany({ where: { coupleId: viewer.couple.coupleId, kind: 'idea' }, select: { params: true } });
    const doneIds = new Set(done.map((e) => (e.params as { ideaId?: string }).ideaId).filter(Boolean) as string[]);
    // Les idées intimes n'apparaissent que si l'espace Intimité est actif des deux côtés, et jamais en famille.
    const intimacyOk = input.company === 'COUPLE' && (await this.bothIntimacyEnabled(viewer.couple));

    const rows = await this.prisma.activityIdea.findMany({
      where: {
        status: 'PUBLISHED',
        locale,
        ...(premium ? {} : { tier: 'FREE' }),
        company: { has: input.company },
        moments: { has: input.moment === 'DATE' ? 'WEEKEND' : input.moment },
        ...(intimacyOk ? {} : { intimate: false }),
      },
    });
    // Score : ambiance exacte d'abord, budget ≤ demandé, puis non réalisées ; tirage stable sur la journée.
    const seed = Math.floor(Date.now() / 86_400_000) + viewer.couple.coupleId.charCodeAt(0);
    const scored = rows
      .filter((r) => BUDGET_ORDER[r.budget] <= BUDGET_ORDER[input.budget])
      .map((r, i) => ({ r, score: (r.moods.includes(input.mood) ? 10 : 0) + (doneIds.has(r.id) ? -3 : 0) + ((seed * 31 + i * 17) % 5) }))
      .sort((a, b) => b.score - a.score);
    const catalog: IdeaDto[] = scored.slice(0, 4).map(({ r }) => ({
      id: r.id, source: 'CATALOG', title: r.title, description: r.description, budget: r.budget, durationMinutes: r.durationMinutes, indoor: r.indoor, moods: r.moods, tags: r.tags, doneBefore: doneIds.has(r.id),
    }));

    const { startAt, endAt } = suggestedWindow(input, timezone);
    const ai: IdeaSuggestionsDto['ai'] = { used: false, reason: input.useAi ? (this.ai.enabled ? null : 'disabled') : 'off', remainingThisMonth: await this.ai.remainingThisMonth(viewer.couple.coupleId) };
    let aiIdeas: IdeaDto[] = [];
    if (input.useAi && this.ai.enabled) {
      const data = { moment: input.moment, date: input.date, company: input.company, budget: input.budget, mood: input.mood, city: input.city ?? null, alreadyProposed: catalog.map((c) => c.title), dayOfWeek: new Date(startAt).toLocaleDateString('fr-FR', { weekday: 'long', timeZone: timezone }) };
      const result = await this.ai.generate(
        { coupleId: viewer.couple.coupleId, userId: viewer.userId, feature: 'ideas', cacheKey: input.city ? undefined : JSON.stringify({ ...data, alreadyProposed: undefined, dayOfWeek: undefined }), cacheTtlSeconds: await this.settings.get('ai.ideas.cacheTtlSeconds') },
        {
          system: 'Tu es « Notre Complice », l’assistant d’une application pour couples. Tu proposes des activités concrètes, réalisables, originales mais réalistes, adaptées au budget et au moment. Tu ne réserves rien.',
          task: 'Propose jusqu’à 3 idées d’activité différentes de celles déjà proposées, au format {"ideas":[{"title","description","budget","durationMinutes","indoor"}]}. budget ∈ FREE|LOW|MEDIUM|HIGH (≤ budget demandé). description : 1 à 3 phrases, concrètes.',
          data,
          schema: aiIdeasSchema,
          maxTokens: 700,
        },
      );
      if (result.ok) {
        ai.used = true;
        aiIdeas = result.data.ideas.map((i, idx) => ({ id: `ai:${Buffer.from(`${i.title}|${idx}`).toString('base64url')}`, source: 'AI', title: i.title, description: i.description, budget: i.budget, durationMinutes: i.durationMinutes, indoor: i.indoor, moods: [input.mood], tags: [], doneBefore: false }));
      } else {
        ai.reason = result.reason;
      }
    }
    return { ideas: [...catalog, ...aiIdeas].slice(0, 6), suggestedStartAt: startAt, suggestedEndAt: endAt, ai };
  }

  /** Ajoute l'idée choisie à l'agenda partagé (action explicite) et l'enregistre comme expérience. */
  async schedule(viewer: Viewer, input: z.infer<typeof scheduleIdeaSchema>, timezone: string): Promise<ScheduledIdeaDto> {
    if (new Date(input.endAt) <= new Date(input.startAt)) throw new AppError(ErrorCode.VALIDATION_FAILED, 'La fin doit être postérieure au début.', 400);
    const isCatalog = !input.ideaId.startsWith('ai:');
    if (isCatalog) {
      const idea = await this.prisma.activityIdea.findFirst({ where: { id: input.ideaId, status: 'PUBLISHED' }, select: { id: true } });
      if (!idea) throw AppError.notFound('Idée introuvable.');
    }
    const event = await this.calendar.create(viewer, {
      title: input.title,
      description: input.description ?? null,
      location: null,
      startAt: input.startAt,
      endAt: input.endAt,
      allDay: false,
      timezone,
      visibility: 'SHARED',
      type: 'DATE',
      color: null,
      category: 'on-fait-quoi',
      rrule: null,
      reminders: [{ minutesBefore: 60, channel: 'push' }],
      invitePartner: input.invitePartner,
    });
    const experience = await this.prisma.experience.create({
      data: {
        coupleId: viewer.couple.coupleId,
        createdByUserId: viewer.userId,
        kind: 'idea',
        source: isCatalog ? 'CATALOG' : 'AI',
        params: { ideaId: input.ideaId } as Prisma.InputJsonValue,
        result: { title: input.title, description: input.description ?? null } as Prisma.InputJsonValue,
        savedAt: new Date(),
        scheduledEventId: event.id,
      },
    });
    return { eventId: event.id, experienceId: experience.id };
  }

  private async bothIntimacyEnabled(couple: CoupleContext): Promise<boolean> {
    if (!couple.partnerUserId) return false;
    const rows = await this.prisma.intimacySetting.count({ where: { coupleId: couple.coupleId, enabledAt: { not: null }, disabledAt: null } });
    return rows === 2;
  }
}

/** Fenêtre par défaut selon le moment : maintenant (+15 min, 2 h), ce soir (20 h), ce week-end (samedi 15 h), date précise (19 h). */
export function suggestedWindow(input: SuggestIdeasInput, timezone: string): { startAt: string; endAt: string } {
  const now = new Date();
  let start: Date;
  if (input.moment === 'NOW') {
    start = new Date(Math.ceil((now.getTime() + 15 * 60_000) / (15 * 60_000)) * 15 * 60_000);
  } else if (input.moment === 'TONIGHT') {
    start = atLocalHour(now, 20, timezone);
    if (start <= now) start = new Date(now.getTime() + 60 * 60_000);
  } else if (input.moment === 'WEEKEND') {
    const d = new Date(now);
    const day = Number(new Intl.DateTimeFormat('en-US', { timeZone: timezone, weekday: 'short' }).format(d) === 'Sat' ? 6 : new Intl.DateTimeFormat('en-US', { timeZone: timezone, weekday: 'short' }).format(d) === 'Sun' ? 0 : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].indexOf(new Intl.DateTimeFormat('en-US', { timeZone: timezone, weekday: 'short' }).format(d)) + 1);
    const daysToSat = day === 6 ? 0 : day === 0 ? 6 : 6 - day;
    d.setUTCDate(d.getUTCDate() + daysToSat);
    start = atLocalHour(d, 15, timezone);
    if (start <= now) start = new Date(now.getTime() + 60 * 60_000);
  } else {
    start = atLocalHour(new Date(`${input.date}T12:00:00Z`), 19, timezone);
  }
  return { startAt: start.toISOString(), endAt: new Date(start.getTime() + 2 * 3_600_000).toISOString() };
}

/** Instant correspondant à `hour`:00 locale (fuseau donné) le jour civil de `date` dans ce fuseau. */
function atLocalHour(date: Date, hour: number, timeZone: string): Date {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date).map((p) => [p.type, p.value]));
  const guess = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), hour);
  const offsetParts = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone, hourCycle: 'h23', hour: '2-digit', minute: '2-digit' }).formatToParts(new Date(guess)).map((p) => [p.type, p.value]));
  const localHour = Number(offsetParts.hour) + Number(offsetParts.minute) / 60;
  return new Date(guess - (localHour - hour) * 3_600_000);
}
