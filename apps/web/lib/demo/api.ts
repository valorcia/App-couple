import { ApiClientError } from '@couple/shared/api-client';
import type { DailyQuestionSettingsDto, AuthResponseDto, BillingStatusDto, CardTableDto, CalendarEventDto, ChallengeDto, CoupleDto, DailyQuestionDto, DesireItemDto, DesireMatchesDto, GameCatalogDto, GameSessionDto, GameSessionListItemDto, GameType, IdeaSuggestionsDto, IntimacySettingsDto, MeDto, NotificationPreferencesDto, Page, ProjectDto, ShoppingListDto, TaskDto } from '@couple/types';
import { DEMO_STATE_KEY } from './mode';
import { CARDS, CATEGORIES, CHALLENGES, COUPLE_ID, DESIRES, IDEAS, ME_ID, PARTNER_DESIRE_YES, PARTNER_ID, PARTNER_TEXTS, PRODUCTS, QUESTIONS, type DemoRound, type DemoSession, type DemoState, initialState, nid } from './data';

type Body = Record<string, unknown>;
interface Options {
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
}

const fail = (status: number, code: string, message: string): never => {
  throw new ApiClientError(status, { code, message });
};
const now = () => new Date().toISOString();
const latency = () => new Promise((r) => setTimeout(r, 120 + Math.random() * 180));
const pick = <T,>(arr: readonly T[], i: number) => arr[i % arr.length]!;

/**
 * API simulée du mode démo. Reproduit les contrats de l'API réelle (DTO identiques) avec un
 * partenaire fictif « Camille » qui répond automatiquement. Les règles de confidentialité sont
 * respectées comme en production : réponses jamais exposées avant révélation, envies du partenaire
 * jamais renvoyées, événements privés du partenaire invisibles.
 */
export class DemoApi {
  private state: DemoState;

  constructor() {
    this.state = this.load() ?? initialState('Alex');
  }

  private load(): DemoState | null {
    try {
      const raw = window.localStorage.getItem(DEMO_STATE_KEY);
      return raw ? (JSON.parse(raw) as DemoState) : null;
    } catch {
      return null;
    }
  }
  private save() {
    try {
      window.localStorage.setItem(DEMO_STATE_KEY, JSON.stringify(this.state));
    } catch {
      /* ignore */
    }
  }

  async request<T>(method: string, path: string, options: Options = {}): Promise<T> {
    await latency();
    const clean = path.replace(/^\//, '').split('?')[0]!;
    const seg = clean.split('/');
    const body = (options.body ?? {}) as Body;
    const q = options.query ?? {};
    const result = this.route(method, seg, body, q);
    this.save();
    return result as T;
  }

  // ------------------------------------------------------------------ routeur
  private route(m: string, s: string[], b: Body, q: Options['query'] & object): unknown {
    const [a, b1, c, d, e] = s;
    const is = (method: string, ...parts: (string | null)[]) => m === method && parts.length === s.length && parts.every((p, i) => p === null || p === s[i]);

    if (a === 'auth') {
      if (is('POST', 'auth', 'login') || is('POST', 'auth', 'register')) {
        if (b1 === 'register' && typeof b.displayName === 'string' && b.displayName.trim()) this.state.profile.displayName = b.displayName.trim();
        return this.session();
      }
      return undefined;
    }
    if (is('GET', 'me')) return this.me();
    if (is('PATCH', 'me', 'profile')) {
      Object.assign(this.state.profile, { displayName: (b.displayName as string) ?? this.state.profile.displayName, bio: (b.bio as string | null) ?? null, interests: (b.interests as string[]) ?? this.state.profile.interests });
      return this.me();
    }
    if (is('POST', 'me', 'confirm-adult')) {
      this.state.profile.adultConfirmed = true;
      return this.me();
    }
    if (a === 'couples') {
      if (is('PATCH', 'couples', 'me')) {
        Object.assign(this.state.couple, { name: (b.name as string | null) ?? null, metAt: (b.metAt as string | null) ?? null, anniversaryAt: (b.anniversaryAt as string | null) ?? null });
        return this.couple();
      }
      if (is('GET', 'couples', 'me')) return { couple: this.couple() };
      return fail(409, 'COUPLE_ALREADY_LINKED', 'En mode démo, vous êtes déjà associé à Camille.');
    }
    if (a === 'calendar') return this.calendar(m, s, b, q);
    if (a === 'games') return this.games(m, s, b, q);
    if (a === 'challenges') return this.challenges(m, s, b, q);
    if (a === 'intimacy') return this.intimacy(m, s, b);
    if (a === 'ideas') return this.ideas(m, s, b);
    if (a === 'billing') {
      if (is('GET', 'billing', 'products')) return PRODUCTS.map((p) => ({ ...p, checkoutAvailable: false }));
      if (is('GET', 'billing', 'status')) return { premium: true, entitlements: ['premium'], subscription: { provider: 'MANUAL', status: 'ACTIVE', productCode: 'premium_yearly', currentPeriodEnd: new Date(Date.now() + 200 * 86400000).toISOString(), cancelAtPeriodEnd: false, manageVia: 'manual' }, checkoutAvailable: false } satisfies BillingStatusDto;
      return fail(503, 'BILLING_UNAVAILABLE', 'Le paiement n’est pas disponible en mode démo.');
    }
    if (a === 'notifications') return this.notifications(m, s, b);
    if (a === 'shopping-lists') return this.shopping(m, s, b, q);
    if (a === 'tasks') return this.tasks(m, s, b, q);
    if (a === 'projects') return this.projects(m, s, b, q);
    void c; void d; void e;
    return fail(404, 'NOT_FOUND', `Route non simulée en démo : ${m} /${s.join('/')}`);
  }

  // ------------------------------------------------------------------ compte & couple
  private session(): AuthResponseDto {
    return { tokens: { accessToken: 'demo', expiresIn: 900 }, user: this.me() };
  }
  private couple(): CoupleDto {
    return { id: COUPLE_ID, status: 'ACTIVE', name: this.state.couple.name, metAt: this.state.couple.metAt, anniversaryAt: this.state.couple.anniversaryAt, activatedAt: '2026-01-10T10:00:00.000Z', createdAt: '2026-01-10T09:00:00.000Z', pendingInvitation: null,
      partner: { id: PARTNER_ID, joinedAt: '2026-01-10T10:00:00.000Z', profile: { displayName: 'Camille', avatarUrl: null, bio: 'Partenaire fictif du mode démo.', interests: ['photo', 'voyages'] } } };
  }
  private me(): MeDto {
    const p = this.state.profile;
    return { id: ME_ID, email: 'demo@entre-nous.app', role: 'USER', status: 'ACTIVE', emailVerified: true, adultConfirmed: p.adultConfirmed, locale: 'fr', timezone: 'Europe/Paris', profile: { displayName: p.displayName, avatarUrl: null, bio: p.bio, interests: p.interests }, couple: this.couple(), entitlements: ['premium'], createdAt: '2026-01-10T09:00:00.000Z' };
  }

  // ------------------------------------------------------------------ agenda
  private calendar(m: string, s: string[], b: Body, q: Options['query'] & object): unknown {
    const id = s[2];
    if (m === 'GET' && s.length === 2) {
      const from = q.from ? new Date(String(q.from)).getTime() : -Infinity;
      const to = q.to ? new Date(String(q.to)).getTime() : Infinity;
      const out: CalendarEventDto[] = [];
      for (const ev of this.state.events) {
        if (!ev.isMine && ev.visibility === 'PRIVATE') continue;
        const occurrences = ev.rrule ? expandWeekly(ev, from, to) : [ev.startAt];
        for (const startAt of occurrences) {
          const endAt = new Date(new Date(startAt).getTime() + (new Date(ev.endAt).getTime() - new Date(ev.startAt).getTime())).toISOString();
          if (new Date(endAt).getTime() < from || new Date(startAt).getTime() > to) continue;
          if (ev.exdates.includes(startAt)) continue;
          const projected = ev.busy ? { ...ev, title: '', description: null, location: null } : ev;
          out.push({ ...projected, startAt, endAt, instanceId: `${ev.id}@${startAt}` });
        }
      }
      return out.sort((x, y) => x.startAt.localeCompare(y.startAt));
    }
    if (m === 'POST' && s.length === 2) {
      const ev: CalendarEventDto = {
        id: nid('ev'), instanceId: '', ownerUserId: ME_ID, isMine: true, busy: false, title: String(b.title ?? 'Sans titre'), description: (b.description as string | null) ?? null, location: (b.location as string | null) ?? null,
        startAt: String(b.startAt), endAt: String(b.endAt), allDay: Boolean(b.allDay), timezone: 'Europe/Paris', visibility: (b.visibility as CalendarEventDto['visibility']) ?? 'SHARED', type: (b.type as CalendarEventDto['type']) ?? 'SHARED', color: (b.color as string | null) ?? null, category: null,
        rrule: (b.rrule as string | null) ?? null, exdates: [], isRecurring: !!b.rrule, reminders: ((b.reminders as { minutesBefore: number; channel?: string }[] | undefined) ?? []).map((r) => ({ id: nid('rm'), minutesBefore: r.minutesBefore, channel: r.channel ?? 'push' })),
        attendees: b.invitePartner ? [{ userId: PARTNER_ID, status: 'PENDING', respondedAt: null }] : [], canEdit: true, surpriseId: null, createdAt: now(), updatedAt: now(),
      };
      this.state.events.push(ev);
      return { ...ev, instanceId: `${ev.id}@${ev.startAt}` };
    }
    const ev = this.state.events.find((x) => x.id === id);
    if (!ev) return fail(404, 'NOT_FOUND', 'Événement introuvable.');
    if (m === 'PATCH' && s.length === 3) {
      if (!ev.isMine) return fail(403, 'FORBIDDEN', 'Seul le propriétaire peut modifier cet événement.');
      for (const k of ['title', 'description', 'location', 'startAt', 'endAt', 'allDay', 'visibility', 'type', 'color', 'rrule'] as const) if (b[k] !== undefined) (ev as unknown as Body)[k] = b[k];
      ev.isRecurring = !!ev.rrule;
      if (b.invitePartner && !ev.attendees.length) ev.attendees = [{ userId: PARTNER_ID, status: 'PENDING', respondedAt: null }];
      ev.updatedAt = now();
      return { ...ev, instanceId: `${ev.id}@${ev.startAt}` };
    }
    if (m === 'DELETE' && s.length === 3) {
      this.state.events = this.state.events.filter((x) => x.id !== id);
      return undefined;
    }
    if (m === 'POST' && s[3] === 'respond') {
      const att = ev.attendees.find((x) => x.userId === ME_ID);
      if (att) Object.assign(att, { status: b.status, respondedAt: now() });
      return undefined;
    }
    if (m === 'POST' && s[3] === 'exclude') {
      ev.exdates.push(String(b.occurrenceStart));
      return undefined;
    }
    return fail(404, 'NOT_FOUND', 'Route agenda non simulée.');
  }

  // ------------------------------------------------------------------ jeux
  private games(m: string, s: string[], b: Body, q: Options['query'] & object): unknown {
    if (m === 'GET' && s[1] === 'catalog') {
      const games = (['SECRET_ANSWERS', 'WHO_KNOWS_BEST', 'DILEMMA', 'WHICH_OF_US', 'CONFESSIONS'] as GameType[]).map((gameType) => {
        const cats = CATEGORIES.filter((c) => (c.gameTypes as readonly string[]).includes(gameType) && (c.code !== 'intimacy' || this.state.intimacy.enabled)).map((c) => ({ code: c.code, name: c.name, description: c.description, icon: c.icon, questionCount: QUESTIONS[gameType].filter((x) => x.category === c.code).length, locked: 'locked' in c && !!c.locked }));
        return { gameType, available: true, categories: cats, totalQuestions: QUESTIONS[gameType].length };
      });
      return { games, premium: true, sessionsLeftToday: null } satisfies GameCatalogDto;
    }
    if (m === 'GET' && s[1] === 'daily' && s.length === 2) return this.daily();
    if (s[1] === 'daily' && s[2] === 'settings') return this.dailySettings(m, b);
    if (m === 'POST' && s[1] === 'daily' && s[2] === 'answer') {
      this.state.daily.myAnswer = String(b.text ?? '').trim();
      this.state.daily.revealedAt = now();
      return this.daily();
    }
    if (m === 'GET' && s[1] === 'sessions' && s.length === 2) {
      const status = q.status ? String(q.status) : undefined;
      const items: GameSessionListItemDto[] = this.state.sessions.filter((x) => !status || x.status === status).map((x) => ({ id: x.id, gameType: x.gameType, status: x.status, roundsTotal: x.rounds.length, roundsClosed: x.rounds.filter(closed).length, myTurn: x.status === 'OPEN' && x.rounds.some((r) => !closed(r) && !r.myAnswer), createdAt: x.createdAt, completedAt: x.completedAt }));
      return { items: items.reverse(), nextCursor: null } satisfies Page<GameSessionListItemDto>;
    }
    if (m === 'POST' && s[1] === 'sessions' && s.length === 2) {
      const gameType = b.gameType as GameType;
      const codes = (b.categoryCodes as string[] | undefined) ?? [];
      const maxLevel = Number(b.maxLevel ?? 4);
      let bank = QUESTIONS[gameType].filter((x) => (!codes.length || codes.includes(x.category)) && (x.category !== 'intimacy' || (this.state.intimacy.enabled && codes.includes('intimacy'))) && (x.level ?? 1) <= maxLevel);
      if (!bank.length) bank = QUESTIONS[gameType].filter((x) => x.category !== 'intimacy' && (x.level ?? 1) <= maxLevel);
      if (!bank.length) return fail(422, 'VALIDATION_FAILED', 'Aucune question disponible pour ces critères.');
      const count = b.length === 'long' ? Math.min(8, bank.length) : Math.min(4, bank.length);
      const rounds: DemoRound[] = bank.slice(0, count).map((x, index) => ({ index, prompt: { text: x.text, options: x.options, categoryCode: x.category, level: x.level, subjectUserId: gameType === 'WHO_KNOWS_BEST' ? (index % 2 === 0 ? ME_ID : PARTNER_ID) : undefined }, myAnswer: null, partnerAnswer: null, revealedAt: null, skipped: false, verdict: null }));
      const session: DemoSession = { id: nid('gs'), gameType, status: 'OPEN', rounds, createdAt: now(), completedAt: null };
      this.state.sessions.push(session);
      return this.sessionDto(session);
    }
    const session = this.state.sessions.find((x) => x.id === s[2]);
    if (!session) return fail(404, 'NOT_FOUND', 'Partie introuvable.');
    if (m === 'GET' && s.length === 3) return this.sessionDto(session);
    if (m === 'DELETE' && s.length === 3) {
      session.status = 'ABANDONED';
      return undefined;
    }
    const round = session.rounds[Number(s[4])];
    if (!round || s[3] !== 'rounds') return fail(404, 'NOT_FOUND', 'Manche introuvable.');
    if (closed(round) && s[5] !== 'verdict') return fail(409, 'GAME_ROUND_CLOSED', 'Cette manche est terminée.');
    if (m === 'POST' && s[5] === 'answer') {
      round.myAnswer = ((b.answer as DemoRound['myAnswer'] | undefined) ?? (b as DemoRound['myAnswer']));
      // Partenaire simulé : répond aussitôt, puis révélation (jamais avant que les deux aient répondu).
      round.partnerAnswer = this.partnerAnswer(session.gameType, round);
      round.revealedAt = now();
      if (session.gameType === 'WHO_KNOWS_BEST' && round.prompt.subjectUserId === PARTNER_ID) round.verdict = pick(['CLOSE', 'EXACT', 'MISS'] as const, round.index);
      this.finishIfDone(session);
      return this.sessionDto(session);
    }
    if (m === 'POST' && s[5] === 'skip') {
      round.skipped = true;
      round.myAnswer = null;
      round.partnerAnswer = null;
      this.finishIfDone(session);
      return this.sessionDto(session);
    }
    if (m === 'POST' && s[5] === 'verdict') {
      if (round.prompt.subjectUserId !== ME_ID) return fail(403, 'FORBIDDEN', 'Seule la personne concernée donne le verdict.');
      round.verdict = b.verdict as DemoRound['verdict'];
      this.finishIfDone(session);
      return this.sessionDto(session);
    }
    return fail(404, 'NOT_FOUND', 'Route jeux non simulée.');
  }
  private partnerAnswer(gameType: GameType, round: DemoRound): DemoRound['partnerAnswer'] {
    if (gameType === 'DILEMMA') return { kind: 'choice', index: (round.index + 1) % 2 === 0 && round.myAnswer?.kind === 'choice' ? round.myAnswer.index : round.index % 2 };
    if (gameType === 'WHICH_OF_US') return { kind: 'vote', userId: round.index % 3 === 0 ? ME_ID : PARTNER_ID };
    return { kind: 'text', text: pick(PARTNER_TEXTS, round.index * 3 + 1) };
  }
  private finishIfDone(session: DemoSession) {
    const pendingVerdict = session.gameType === 'WHO_KNOWS_BEST' && session.rounds.some((r) => r.revealedAt && !r.skipped && !r.verdict);
    if (session.rounds.every(closed) && !pendingVerdict) {
      session.status = 'COMPLETED';
      session.completedAt = now();
    }
  }
  private sessionDto(x: DemoSession): GameSessionDto {
    const current = x.rounds.find((r) => !closed(r));
    const summary = x.status === 'COMPLETED' ? this.summary(x) : null;
    return {
      id: x.id, gameType: x.gameType, status: x.status, createdByUserId: ME_ID, participantIds: [ME_ID, PARTNER_ID], currentRoundIndex: current ? current.index : null, summary, createdAt: x.createdAt, completedAt: x.completedAt,
      rounds: x.rounds.map((r) => ({
        index: r.index, prompt: r.prompt, myAnswer: r.myAnswer, partnerAnswered: !!r.partnerAnswer, revealedAt: r.revealedAt, partnerAnswer: r.revealedAt ? r.partnerAnswer : null, skipped: r.skipped, verdict: r.verdict,
        awaitingVerdictFrom: x.gameType === 'WHO_KNOWS_BEST' && r.revealedAt && !r.verdict ? r.prompt.subjectUserId ?? null : null,
        funLine: r.revealedAt ? funLine(x.gameType, r) : null,
      })),
    };
  }
  private summary(x: DemoSession): Record<string, unknown> {
    const revealed = x.rounds.filter((r) => r.revealedAt).length;
    const base: Record<string, unknown> = { total: x.rounds.length, revealed, skipped: x.rounds.filter((r) => r.skipped).length };
    if (x.gameType === 'DILEMMA') base.same = x.rounds.filter((r) => r.myAnswer?.kind === 'choice' && r.partnerAnswer?.kind === 'choice' && r.myAnswer.index === r.partnerAnswer.index).length;
    if (x.gameType === 'WHICH_OF_US') {
      const votesFor: Record<string, number> = {};
      for (const r of x.rounds) for (const a of [r.myAnswer, r.partnerAnswer]) if (a?.kind === 'vote') votesFor[a.userId] = (votesFor[a.userId] ?? 0) + 1;
      base.unanimous = x.rounds.filter((r) => r.myAnswer?.kind === 'vote' && r.partnerAnswer?.kind === 'vote' && r.myAnswer.userId === r.partnerAnswer.userId).length;
      base.votesFor = votesFor;
    }
    if (x.gameType === 'WHO_KNOWS_BEST') {
      const scores: Record<string, { exact: number; close: number; miss: number; points: number }> = {};
      for (const r of x.rounds) {
        if (!r.verdict) continue;
        const guesser = r.prompt.subjectUserId === ME_ID ? PARTNER_ID : ME_ID;
        const sc = (scores[guesser] ??= { exact: 0, close: 0, miss: 0, points: 0 });
        if (r.verdict === 'EXACT') {
          sc.exact += 1;
          sc.points += 2;
        } else if (r.verdict === 'CLOSE') {
          sc.close += 1;
          sc.points += 1;
        } else sc.miss += 1;
      }
      base.scores = scores;
    }
    return base;
  }
  private daily(): DailyQuestionDto {
    const d = this.state.daily;
    const cat = CATEGORIES.find((c) => c.code === (d.category ?? 'daily'));
    return { id: 'daily-demo', date: now().slice(0, 10), text: d.text, categoryCode: cat?.code ?? 'daily', categoryName: cat?.name ?? 'Quotidien', level: d.level ?? 1, myAnswer: d.myAnswer, partnerAnswered: true, revealedAt: d.revealedAt, partnerAnswer: d.revealedAt ? d.partnerAnswer : null };
  }

  /** Réglage partagé de la question du jour : même règle que l'API (plafond 2 sans espace Intimité à deux). */
  private dailySettings(m: string, b: Body): DailyQuestionSettingsDto {
    const st = (this.state.dailySettings ??= { themes: [], intensity: 2, hour: 9 });
    const both = this.state.intimacy.enabled;
    const maxIntensity = both ? this.state.intimacy.maxIntensity : 2;
    const intimacyOk = (intensity: number) => both && intensity > 2;
    let redrawn = false;
    if (m === 'PUT') {
      const before = { themes: [...st.themes], intensity: st.intensity };
      if (typeof b.intensity === 'number') st.intensity = Math.min(Math.max(1, Math.floor(b.intensity)), maxIntensity);
      if (Array.isArray(b.themes)) st.themes = (b.themes as string[]).filter((c) => CATEGORIES.some((x) => x.code === c) && (c !== 'intimacy' || intimacyOk(st.intensity)));
      if (typeof b.hour === 'number') {
        if (b.hour < 6 || b.hour > 22) fail(400, 'VALIDATION_ERROR', 'Heure entre 6 h et 22 h.');
        st.hour = Math.floor(b.hour);
      }
      const changed = before.intensity !== st.intensity || before.themes.join() !== st.themes.join();
      if (changed && !this.state.daily.myAnswer) {
        const allowed = st.themes.length ? st.themes : CATEGORIES.map((c) => c.code).filter((c) => c !== 'intimacy');
        const bank = QUESTIONS.SECRET_ANSWERS.filter((q) => allowed.includes(q.category) && (q.level ?? 1) <= st.intensity && q.text !== this.state.daily.text);
        const pick = bank[Math.floor(Math.random() * bank.length)];
        if (pick) {
          this.state.daily = { ...this.state.daily, text: pick.text, category: pick.category, level: pick.level ?? 1, revealedAt: null };
          redrawn = true;
        }
      }
      if (changed || typeof b.hour === 'number') this.notify('DAILY_QUESTION', 'daily.settings_changed', 'Question du jour', 'Camille voit votre réglage : thème, intensité ou heure.', '/');
    }
    const intensity = Math.min(st.intensity, maxIntensity);
    return {
      themes: st.themes.filter((c) => c !== 'intimacy' || intimacyOk(intensity)),
      intensity,
      hour: st.hour,
      maxIntensity,
      availableThemes: CATEGORIES.filter((c) => (c.gameTypes as readonly string[]).includes('SECRET_ANSWERS') && (c.code !== 'intimacy' || intimacyOk(intensity))).map((c) => ({ code: c.code, name: c.name, description: c.description, icon: c.icon, questionCount: QUESTIONS.SECRET_ANSWERS.filter((q) => q.category === c.code).length, intimate: c.code === 'intimacy' })),
      ...(m === 'PUT' ? { redrawn } : {}),
    };
  }

  // ------------------------------------------------------------------ défis
  private challenges(m: string, s: string[], b: Body, q: Options['query'] & object): unknown {
    const withProgress = (c: ChallengeDto): ChallengeDto => ({ ...c, progress: this.state.challengeProgress[c.id] ?? null });
    if (m === 'GET' && s.length === 1) return CHALLENGES.filter((c) => (!c.intimate || this.state.intimacy.enabled) && (!q.budget || c.budget === q.budget) && (!q.difficulty || c.difficulty === q.difficulty)).map(withProgress);
    if (m === 'GET' && s[1] === 'progress') return CHALLENGES.filter((c) => this.state.challengeProgress[c.id]).map(withProgress);
    if (m === 'GET' && s[1] === 'featured') {
      const active = CHALLENGES.map(withProgress).find((c) => c.progress && ['PROPOSED', 'ACCEPTED'].includes(c.progress.status));
      return active ? { challenge: active, kind: 'active' } : { challenge: withProgress(pick(CHALLENGES.filter((c) => !c.locked && !c.intimate), new Date().getDate())), kind: 'suggestion' };
    }
    const c = CHALLENGES.find((x) => x.id === s[1]);
    if (!c || m !== 'POST') return fail(404, 'NOT_FOUND', 'Défi introuvable.');
    if (c.locked) return fail(402, 'PREMIUM_REQUIRED', 'Ce défi est réservé à Premium Couple.');
    const cur = this.state.challengeProgress[c.id];
    const action = s[2];
    const base = cur ?? { id: nid('cp'), challengeId: c.id, status: 'PROPOSED' as const, proposedByUserId: ME_ID, completedByUserIds: [] as string[], completedByMe: false, completedByPartner: false, note: null, completedAt: null, updatedAt: now() };
    let next = { ...base, updatedAt: now() };
    if (action === 'propose') next = { ...next, status: 'ACCEPTED', proposedByUserId: ME_ID, completedByUserIds: [], completedByMe: false, completedByPartner: false, completedAt: null }; // Camille accepte aussitôt (simulation)
    else if (action === 'accept') next.status = 'ACCEPTED';
    else if (action === 'skip') next.status = 'SKIPPED';
    else if (action === 'complete') {
      next = { ...next, completedByMe: true, completedByPartner: true, completedByUserIds: [ME_ID, PARTNER_ID], status: 'COMPLETED', completedAt: now(), note: (b.note as string | null) ?? next.note };
      this.notify('CHALLENGE', 'challenge.completed', 'Défi réussi ensemble', `« ${c.title} » est validé par vous deux.`, '/defis');
    }
    this.state.challengeProgress[c.id] = next;
    return withProgress(c);
  }

  // ------------------------------------------------------------------ intimité
  private intimacy(m: string, s: string[], b: Body): unknown {
    const st = this.state.intimacy;
    const settings = (): IntimacySettingsDto => ({ adultConfirmed: this.state.profile.adultConfirmed, moduleAvailable: true, enabled: st.enabled, enabledCategories: st.enabledCategories, maxIntensity: st.maxIntensity, partnerEnabled: true, bothEnabled: st.enabled, premium: true });
    const guard = () => {
      if (!this.state.profile.adultConfirmed) fail(403, 'ADULT_CONFIRMATION_REQUIRED', 'Confirmez votre majorité.');
      if (!st.enabled) fail(403, 'INTIMACY_DISABLED', 'Activez d’abord votre espace Intimité.');
    };
    const visible = () => DESIRES.filter((d) => st.enabledCategories.includes(d.category) && d.intensity <= st.maxIntensity);
    const mutual = () => visible().filter((d) => st.myChoices[d.id] === 'YES' && PARTNER_DESIRE_YES.has(d.id));
    if (m === 'GET' && s[1] === 'settings') return settings();
    if (m === 'PUT' && s[1] === 'settings') {
      if (!this.state.profile.adultConfirmed) return fail(403, 'ADULT_CONFIRMATION_REQUIRED', 'Confirmez votre majorité.');
      st.enabled = Boolean(b.enabled);
      if (Array.isArray(b.enabledCategories)) st.enabledCategories = b.enabledCategories as typeof st.enabledCategories;
      if (typeof b.maxIntensity === 'number') st.maxIntensity = b.maxIntensity;
      if (!st.enabled) st.iRequested = false;
      return settings();
    }
    guard();
    if (m === 'GET' && s[1] === 'items') return visible().map((d): DesireItemDto => ({ ...d, myChoice: st.myChoices[d.id] ?? null }));
    if (m === 'PUT' && s[1] === 'items' && s[3] === 'response') {
      const d = DESIRES.find((x) => x.id === s[2]);
      if (!d) return fail(404, 'NOT_FOUND', 'Envie introuvable.');
      if (d.locked) return fail(402, 'PREMIUM_REQUIRED', 'Réservé à Premium Couple.');
      st.myChoices[d.id] = b.choice as 'YES' | 'NO' | 'MAYBE';
      return { ...d, myChoice: st.myChoices[d.id] ?? null } satisfies DesireItemDto;
    }
    if (m === 'DELETE' && s[1] === 'responses') {
      st.myChoices = {};
      st.iRequested = false;
      st.revealedAt = null;
      return undefined;
    }
    if (s[1] === 'cards') {
      st.cardsSeen ??= []; st.cardsDone ??= 0; st.currentCard ??= null;
      const table = (): CardTableDto => {
        const morning = new Date(); morning.setHours(29, 0, 0, 0);
        const cur = st.currentCard ? CARDS.find((c) => c.id === st.currentCard!.id) : null;
        return {
          levels: [1, 2, 3, 4].map((level) => { const remaining = CARDS.filter((c) => c.level === level && !st.cardsSeen.includes(c.id)).length; const reason = level > st.maxIntensity ? 'intensity' as const : null; return { level, available: !reason && remaining > 0, reason, remaining }; }),
          current: cur && st.currentCard ? { card: cur, drawnByUserId: st.currentCard.drawnByUserId, drawnAt: st.currentCard.drawnAt } : null,
          doneCount: st.cardsDone, expiresAt: st.currentCard || st.cardsSeen.length ? morning.toISOString() : null,
        };
      };
      if (m === 'POST' && s[2] === 'draw') {
        const level = Number(b.level);
        if (level > st.maxIntensity) return fail(403, 'FORBIDDEN', 'Ce niveau dépasse l’intensité acceptée par l’un de vous deux.');
        const pool = CARDS.filter((c) => c.level === level && !st.cardsSeen.includes(c.id));
        if (!pool.length) return fail(409, 'CONFLICT', 'Plus de carte à ce niveau ce soir.');
        const picked = pool[Math.floor(Math.random() * pool.length)]!;
        st.cardsSeen.push(picked.id);
        st.currentCard = { id: picked.id, drawnByUserId: ME_ID, drawnAt: now() };
        return table();
      }
      if (m === 'POST' && s[2] === 'done') { if (st.currentCard) { st.cardsDone += 1; st.currentCard = null; } return table(); }
      if (m === 'DELETE') { st.cardsSeen = []; st.cardsDone = 0; st.currentCard = null; return table(); }
      return table();
    }
    if (s[1] === 'tonight') {
      if (m === 'PUT') {
        st.tonightMine = Boolean(b.on);
        // Partenaire simulé : Camille allume le sien quand vous allumez le vôtre (démo).
        st.tonightPartner = st.tonightMine;
        if (st.tonightMine) this.notify('SUGGESTION', 'intimacy.tonight', 'Un signal partagé', 'Vous avez quelque chose en commun ce soir. À retrouver dans votre espace.', '/intimite');
      }
      const morning = new Date(); morning.setHours(29, 0, 0, 0);
      return { mine: st.tonightMine, mutual: st.tonightMine && st.tonightPartner, expiresAt: st.tonightMine ? morning.toISOString() : null };
    }
    if (s[1] === 'matches') {
      if (m === 'POST' && s[2] === 'reveal') {
        st.iRequested = true;
        st.revealedAt = now();
      }
      const list = mutual();
      const revealed = st.iRequested ? list.map((d) => ({ id: d.id, category: d.category, intensity: d.intensity, text: d.text, revealedAt: st.revealedAt ?? now() })) : [];
      return { mutualCount: list.length, revealed, pendingCount: st.iRequested ? 0 : list.length, iRequested: st.iRequested, partnerRequested: st.iRequested, myAnswersCount: Object.keys(st.myChoices).length } satisfies DesireMatchesDto;
    }
    return fail(404, 'NOT_FOUND', 'Route intimité non simulée.');
  }

  // ------------------------------------------------------------------ « On fait quoi ? »
  private ideas(m: string, s: string[], b: Body): unknown {
    if (m === 'POST' && s[1] === 'suggest') {
      const moment = String(b.moment ?? 'TONIGHT');
      const company = String(b.company ?? 'COUPLE');
      const budgetOrder = ['FREE', 'LOW', 'MEDIUM', 'HIGH'];
      const maxBudget = budgetOrder.indexOf(String(b.budget ?? 'HIGH'));
      const mood = b.mood ? String(b.mood) : null;
      let list = IDEAS.filter((i) => i.moments.includes(moment) && i.company.includes(company) && budgetOrder.indexOf(i.budget) <= maxBudget && (!mood || i.moods.includes(mood as never)) && !(i.moods.includes('SPICY') && !this.state.intimacy.enabled));
      if (list.length < 3) list = IDEAS.filter((i) => i.company.includes(company) && budgetOrder.indexOf(i.budget) <= maxBudget && !(i.moods.includes('SPICY') && !this.state.intimacy.enabled));
      const start = new Date();
      if (moment === 'TONIGHT') start.setHours(19, 30, 0, 0);
      else if (moment === 'WEEKEND') { start.setDate(start.getDate() + ((6 - start.getDay() + 7) % 7 || 7)); start.setHours(10, 0, 0, 0); }
      else if (moment === 'DATE' && b.date) { const d = new Date(String(b.date)); d.setHours(19, 0, 0, 0); start.setTime(d.getTime()); }
      else start.setMinutes(start.getMinutes() + 30, 0, 0);
      const end = new Date(start.getTime() + 2 * 3600 * 1000);
      return { ideas: list.slice(0, 5).map((i) => ({ id: i.id, source: 'CATALOG', title: i.title, description: i.description, budget: i.budget, durationMinutes: i.durationMinutes, indoor: i.indoor, moods: i.moods, tags: i.tags, doneBefore: this.state.doneIdeas.includes(i.id) })), suggestedStartAt: start.toISOString(), suggestedEndAt: end.toISOString(), ai: { used: false, reason: 'disabled', remainingThisMonth: null } } satisfies IdeaSuggestionsDto;
    }
    if (m === 'POST' && s[1] === 'schedule') {
      const ev = this.calendar('POST', ['calendar', 'events'], { title: b.title, description: b.description, startAt: b.startAt, endAt: b.endAt, type: 'DATE', visibility: 'SHARED', invitePartner: true }, {}) as CalendarEventDto;
      this.state.doneIdeas.push(String(b.ideaId));
      this.notify('CALENDAR', 'calendar.invite', 'Sortie ajoutée à l’agenda', `« ${ev.title} » est proposée à Camille.`, '/agenda');
      return { eventId: ev.id, experienceId: nid('xp') };
    }
    return fail(404, 'NOT_FOUND', 'Route idées non simulée.');
  }

  // ------------------------------------------------------------------ notifications
  private notify(category: string, type: string, title: string, body: string, path: string) {
    this.state.notifications.unshift({ id: nid('nt'), category: category as never, type, title, body, data: { path }, readAt: null, createdAt: now() });
  }
  private notifications(m: string, s: string[], b: Body): unknown {
    const n = this.state.notifications;
    if (m === 'GET' && s.length === 1) return { items: n, nextCursor: null };
    if (m === 'GET' && s[1] === 'unread-count') return { count: n.filter((x) => !x.readAt).length };
    if (m === 'POST' && s[1] === 'read-all') { n.forEach((x) => (x.readAt ??= now())); return undefined; }
    if (m === 'POST' && s[2] === 'read') { const x = n.find((y) => y.id === s[1]); if (x) x.readAt ??= now(); return undefined; }
    if (s[1] === 'preferences') {
      if (m === 'PUT') {
        if (Array.isArray(b.preferences)) this.state.notificationPrefs = b.preferences as typeof this.state.notificationPrefs;
        this.state.quiet = { start: (b.quietStart as string | null) ?? null, end: (b.quietEnd as string | null) ?? null };
      }
      return { preferences: this.state.notificationPrefs, quietStart: this.state.quiet.start, quietEnd: this.state.quiet.end, devices: [] } as NotificationPreferencesDto;
    }
    return fail(404, 'NOT_FOUND', 'Route notifications non simulée.');
  }

  // ------------------------------------------------------------------ quotidien
  private shopping(m: string, s: string[], b: Body, q: Options['query'] & object): unknown {
    const refresh = (l: ShoppingListDto) => {
      l.items.sort((x, y) => Number(!!x.checkedAt) - Number(!!y.checkedAt) || x.position - y.position);
      l.itemCount = l.items.length;
      l.checkedCount = l.items.filter((i) => i.checkedAt).length;
      l.updatedAt = now();
      return l;
    };
    if (m === 'GET' && s.length === 1) return this.state.lists.filter((l) => (q.archived === 'true' ? true : !l.archivedAt)).map(refresh);
    if (m === 'POST' && s.length === 1) {
      const l: ShoppingListDto = { id: nid('sl'), name: String(b.name), archivedAt: null, itemCount: 0, checkedCount: 0, items: [], updatedAt: now() };
      this.state.lists.unshift(l);
      return l;
    }
    const l = this.state.lists.find((x) => x.id === s[1]);
    if (!l) return fail(404, 'NOT_FOUND', 'Liste introuvable.');
    if (m === 'PATCH' && s.length === 2) { if (typeof b.name === 'string') l.name = b.name; if (b.archived !== undefined) l.archivedAt = b.archived ? now() : null; return refresh(l); }
    if (m === 'DELETE' && s.length === 2) { this.state.lists = this.state.lists.filter((x) => x.id !== l.id); return undefined; }
    if (m === 'POST' && s[2] === 'items') { l.items.push({ id: nid('si'), name: String(b.name), quantity: (b.quantity as string | null) ?? null, category: (b.category as string | null) ?? null, position: l.items.length + 1, checkedAt: null, checkedByUserId: null }); return refresh(l); }
    if (m === 'POST' && s[2] === 'clear-checked') { l.items = l.items.filter((i) => !i.checkedAt); return refresh(l); }
    const item = l.items.find((i) => i.id === s[3]);
    if (!item) return fail(404, 'NOT_FOUND', 'Article introuvable.');
    if (m === 'PATCH') { if (b.checked !== undefined) { item.checkedAt = b.checked ? now() : null; item.checkedByUserId = b.checked ? ME_ID : null; } if (typeof b.name === 'string') item.name = b.name; return refresh(l); }
    if (m === 'DELETE') { l.items = l.items.filter((i) => i.id !== item.id); return refresh(l); }
    return fail(404, 'NOT_FOUND', 'Route listes non simulée.');
  }
  private tasks(m: string, s: string[], b: Body, q: Options['query'] & object): unknown {
    if (m === 'GET' && s.length === 1) return this.state.tasks.filter((t) => (!q.status || t.status === q.status) && (!q.projectId || t.projectId === q.projectId));
    if (m === 'POST' && s.length === 1) {
      const t: TaskDto = { id: nid('tk'), title: String(b.title), description: (b.description as string | null) ?? null, creatorUserId: ME_ID, assigneeUserId: (b.assigneeUserId as string | null) ?? null, projectId: (b.projectId as string | null) ?? null, priority: (b.priority as TaskDto['priority']) ?? 'MEDIUM', status: 'OPEN', dueAt: (b.dueAt as string | null) ?? null, rrule: (b.rrule as string | null) ?? null, completedAt: null, comments: [], createdAt: now(), updatedAt: now() };
      this.state.tasks.unshift(t);
      this.syncProjects();
      return t;
    }
    const t = this.state.tasks.find((x) => x.id === s[1]);
    if (!t) return fail(404, 'NOT_FOUND', 'Tâche introuvable.');
    if (m === 'PATCH') {
      const becomingDone = b.status === 'DONE' && t.status !== 'DONE';
      for (const k of ['title', 'description', 'assigneeUserId', 'projectId', 'priority', 'dueAt', 'rrule', 'status'] as const) if (b[k] !== undefined) (t as unknown as Body)[k] = b[k];
      if (b.status !== undefined) t.completedAt = b.status === 'DONE' ? now() : null;
      t.updatedAt = now();
      if (becomingDone && t.rrule && t.dueAt) {
        const next = new Date(t.dueAt);
        if (t.rrule.includes('DAILY')) next.setDate(next.getDate() + 1); else if (t.rrule.includes('MONTHLY')) next.setMonth(next.getMonth() + 1); else next.setDate(next.getDate() + 7);
        this.state.tasks.unshift({ ...t, id: nid('tk'), status: 'OPEN', completedAt: null, dueAt: next.toISOString(), comments: [], createdAt: now(), updatedAt: now() });
      }
      this.syncProjects();
      return t;
    }
    if (m === 'DELETE') { this.state.tasks = this.state.tasks.filter((x) => x.id !== t.id); this.syncProjects(); return undefined; }
    if (m === 'POST' && s[2] === 'comments') { t.comments.push({ id: nid('tc'), userId: ME_ID, body: String(b.body), createdAt: now() }); t.updatedAt = now(); return t; }
    return fail(404, 'NOT_FOUND', 'Route tâches non simulée.');
  }
  private syncProjects() {
    for (const p of this.state.projects) {
      p.openTasks = this.state.tasks.filter((t) => t.projectId === p.id && t.status === 'OPEN').length;
      p.progress = p.steps.length ? Math.round((p.steps.filter((x) => x.completedAt).length / p.steps.length) * 100) : 0;
    }
  }
  private projects(m: string, s: string[], b: Body, q: Options['query'] & object): unknown {
    const TEMPLATE_STEPS: Record<string, string[]> = {
      house: ['Définir le budget et le financement', 'Lister les critères (lieu, surface, extérieur)', 'Visiter des biens', 'Faire une offre', 'Signer le compromis', 'Obtenir le prêt', 'Signer chez le notaire', 'Emménager'],
      trip: ['Choisir la destination et les dates', 'Fixer le budget', 'Réserver les transports', 'Réserver les hébergements', 'Préparer l’itinéraire', 'Vérifier papiers et assurances', 'Faire les valises'],
      wedding: ['Fixer la date et le budget', 'Choisir le lieu', 'Dresser la liste des invités', 'Envoyer les invitations', 'Choisir traiteur, musique, photographe', 'Tenues et alliances', 'Préparer la cérémonie', 'Organiser le jour J'],
      renovation: ['Définir le projet et le budget', 'Demander des devis', 'Choisir les artisans', 'Planifier les travaux', 'Commander les matériaux', 'Suivre le chantier', 'Réception des travaux'],
      baby: ['Rendez-vous médicaux', 'Préparer la chambre', 'Liste de naissance', 'Démarches administratives', 'Choisir le mode de garde', 'Préparer la valise de maternité', 'Organiser les premières semaines'],
      move: ['Fixer la date', 'Résilier et souscrire les contrats (énergie, internet)', 'Changement d’adresse', 'Trier et donner', 'Cartons', 'Réserver camion ou déménageurs', 'État des lieux', 'Installation'],
      custom: [],
    };
    this.syncProjects();
    if (m === 'GET' && s[1] === 'templates') return Object.entries(TEMPLATE_STEPS).map(([code, steps]) => ({ code, steps }));
    if (m === 'GET' && s.length === 1) return this.state.projects.filter((p) => (q.archived === 'true' ? true : p.status !== 'ARCHIVED'));
    if (m === 'POST' && s.length === 1) {
      const code = String(b.templateCode ?? 'custom');
      const p: ProjectDto = { id: nid('pj'), templateCode: code, title: String(b.title), goal: (b.goal as string | null) ?? null, description: (b.description as string | null) ?? null, status: 'ACTIVE', startAt: (b.startAt as string | null) ?? null, targetAt: (b.targetAt as string | null) ?? null, budgetCents: (b.budgetCents as number | null) ?? null, currency: 'EUR', progress: 0, openTasks: 0, createdAt: now(), updatedAt: now(), notes: [],
        steps: (TEMPLATE_STEPS[code] ?? []).map((title, position) => ({ id: nid('ps'), title, position, dueAt: null, completedAt: null })) };
      this.state.projects.unshift(p);
      return p;
    }
    const p = this.state.projects.find((x) => x.id === s[1]);
    if (!p) return fail(404, 'NOT_FOUND', 'Projet introuvable.');
    const done = () => { p.updatedAt = now(); this.syncProjects(); return p; };
    if (m === 'GET' && s.length === 2) return p;
    if (m === 'PATCH' && s.length === 2) { for (const k of ['title', 'goal', 'description', 'status', 'startAt', 'targetAt', 'budgetCents'] as const) if (b[k] !== undefined) (p as unknown as Body)[k] = b[k]; return done(); }
    if (m === 'DELETE' && s.length === 2) { this.state.projects = this.state.projects.filter((x) => x.id !== p.id); this.state.tasks.forEach((t) => { if (t.projectId === p.id) t.projectId = null; }); return undefined; }
    if (m === 'POST' && s[2] === 'steps') { p.steps.push({ id: nid('ps'), title: String(b.title), position: p.steps.length, dueAt: (b.dueAt as string | null) ?? null, completedAt: null }); return done(); }
    if (m === 'POST' && s[2] === 'notes') { p.notes.unshift({ id: nid('pn'), body: String(b.body), createdAt: now(), updatedAt: now() }); return done(); }
    if (s[2] === 'steps') {
      const st = p.steps.find((x) => x.id === s[3]);
      if (!st) return fail(404, 'NOT_FOUND', 'Étape introuvable.');
      if (m === 'PATCH') { if (b.completed !== undefined) st.completedAt = b.completed ? now() : null; if (typeof b.title === 'string') st.title = b.title; return done(); }
      if (m === 'DELETE') { p.steps = p.steps.filter((x) => x.id !== st.id); return done(); }
    }
    if (s[2] === 'notes' && m === 'DELETE') { p.notes = p.notes.filter((x) => x.id !== s[3]); return done(); }
    return fail(404, 'NOT_FOUND', 'Route projets non simulée.');
  }
}

const closed = (r: DemoRound) => r.skipped || r.revealedAt !== null;

function funLine(gameType: GameType, r: DemoRound): string | null {
  if (r.skipped) return null;
  if (gameType === 'DILEMMA') return r.myAnswer?.kind === 'choice' && r.partnerAnswer?.kind === 'choice' && r.myAnswer.index === r.partnerAnswer.index ? 'Même choix : vous êtes accordés.' : 'Deux avis, une seule soirée à partager.';
  if (gameType === 'WHICH_OF_US') return r.myAnswer?.kind === 'vote' && r.partnerAnswer?.kind === 'vote' && r.myAnswer.userId === r.partnerAnswer.userId ? 'Unanimité !' : 'Chacun son avis… le débat est ouvert.';
  return null;
}

/** Occurrences hebdomadaires d'un événement récurrent dans la fenêtre demandée (démo : FREQ=WEEKLY seulement). */
function expandWeekly(ev: CalendarEventDto, from: number, to: number): string[] {
  const out: string[] = [];
  const start = new Date(ev.startAt);
  const lower = Number.isFinite(from) ? from : start.getTime();
  const upper = Number.isFinite(to) ? to : start.getTime() + 90 * 86400000;
  for (let d = new Date(start); d.getTime() <= upper && out.length < 60; d.setDate(d.getDate() + 7)) {
    if (d.getTime() >= lower - 7 * 86400000) out.push(d.toISOString());
  }
  return out;
}
