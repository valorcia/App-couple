/**
 * Moteur de jeux — logique pure, sans dépendance (testable unitairement, partageable mobile/web/API).
 * Principe central : une réponse n'est jamais exposée au partenaire avant la révélation,
 * qui est un fait serveur (les deux ont répondu, ou la manche est passée).
 */

export type GameType = 'SECRET_ANSWERS' | 'WHO_KNOWS_BEST' | 'DILEMMA' | 'WHICH_OF_US' | 'CHALLENGE' | 'CONFESSIONS' | 'MEMORY_QUIZ';

/** Contenu d'une manche, copié du catalogue au moment de la création. */
export interface RoundPrompt {
  text: string;
  /** Dilemmes : deux options. */
  options?: string[];
  /** Qui connaît le mieux : l'utilisateur qui répond sur lui-même ; l'autre devine. */
  subjectUserId?: string;
  categoryCode?: string | null;
  level?: number;
}

export type AnswerPayload =
  | { kind: 'text'; text: string }
  | { kind: 'choice'; index: number }
  | { kind: 'vote'; userId: string };

export type Verdict = 'EXACT' | 'CLOSE' | 'MISS';

export interface RoundResult {
  skipped?: boolean;
  skippedByUserId?: string;
  verdict?: Verdict;
}

export interface RoundState {
  index: number;
  prompt: RoundPrompt;
  answers: Record<string, AnswerPayload>;
  revealedAt: Date | null;
  result: RoundResult | null;
}

export const SESSION_LENGTHS = { short: 5, long: 10 } as const;
export type SessionLength = keyof typeof SESSION_LENGTHS;

/** Les deux participants ont répondu → révélation possible. */
export function canReveal(round: RoundState, participantIds: readonly string[]): boolean {
  return participantIds.length === 2 && participantIds.every((id) => round.answers[id] !== undefined);
}

export function isRoundClosed(round: RoundState): boolean {
  return round.revealedAt !== null || round.result?.skipped === true;
}

export function nextOpenRoundIndex(rounds: readonly RoundState[]): number | null {
  const next = rounds.find((r) => !isRoundClosed(r));
  return next ? next.index : null;
}

export function isSessionComplete(rounds: readonly RoundState[]): boolean {
  return rounds.length > 0 && rounds.every(isRoundClosed);
}

/** Valide la forme d'une réponse pour un type de jeu et une manche. */
export function validateAnswer(gameType: GameType, round: RoundState, answer: AnswerPayload, participantIds: readonly string[], userId: string): string | null {
  switch (gameType) {
    case 'DILEMMA':
      if (answer.kind !== 'choice') return 'Réponse attendue : un choix.';
      if (!round.prompt.options || answer.index < 0 || answer.index >= round.prompt.options.length) return 'Choix hors limites.';
      return null;
    case 'WHICH_OF_US':
      if (answer.kind !== 'vote') return 'Réponse attendue : un vote.';
      if (!participantIds.includes(answer.userId)) return 'Vote pour un inconnu.';
      return null;
    case 'WHO_KNOWS_BEST':
    case 'SECRET_ANSWERS':
    case 'CONFESSIONS':
    case 'MEMORY_QUIZ':
      if (answer.kind !== 'text') return 'Réponse attendue : un texte.';
      if (answer.text.trim().length === 0) return 'Réponse vide.';
      if (answer.text.length > 1000) return 'Réponse trop longue.';
      void userId;
      return null;
    default:
      return 'Jeu non pris en charge.';
  }
}

export interface RoundSummary {
  index: number;
  kind: 'same' | 'different' | 'unanimous' | 'split' | 'revealed' | 'skipped' | 'verdict';
  detail?: string;
}

/** Résumé d'une manche révélée, pour l'affichage et les statistiques de fin de partie. */
export function summarizeRound(gameType: GameType, round: RoundState, participantIds: readonly string[]): RoundSummary {
  if (round.result?.skipped) return { index: round.index, kind: 'skipped' };
  const [a, b] = participantIds;
  const ans = (id?: string) => (id ? round.answers[id] : undefined);
  switch (gameType) {
    case 'DILEMMA': {
      const x = ans(a);
      const y = ans(b);
      if (x?.kind === 'choice' && y?.kind === 'choice') return { index: round.index, kind: x.index === y.index ? 'same' : 'different' };
      return { index: round.index, kind: 'revealed' };
    }
    case 'WHICH_OF_US': {
      const x = ans(a);
      const y = ans(b);
      if (x?.kind === 'vote' && y?.kind === 'vote') {
        return x.userId === y.userId ? { index: round.index, kind: 'unanimous', detail: x.userId } : { index: round.index, kind: 'split' };
      }
      return { index: round.index, kind: 'revealed' };
    }
    case 'WHO_KNOWS_BEST':
      return round.result?.verdict ? { index: round.index, kind: 'verdict', detail: round.result.verdict } : { index: round.index, kind: 'revealed' };
    default:
      return { index: round.index, kind: 'revealed' };
  }
}

export interface SessionSummary {
  total: number;
  revealed: number;
  skipped: number;
  /** Dilemmes : manches où les deux ont fait le même choix. */
  same?: number;
  /** Lequel de nous deux : votes unanimes, et pour qui. */
  unanimous?: number;
  votesFor?: Record<string, number>;
  /** Qui connaît le mieux : score par devineur. */
  scores?: Record<string, { exact: number; close: number; miss: number; points: number }>;
}

export function summarizeSession(gameType: GameType, rounds: readonly RoundState[], participantIds: readonly string[]): SessionSummary {
  const summaries = rounds.map((r) => summarizeRound(gameType, r, participantIds));
  const base: SessionSummary = {
    total: rounds.length,
    revealed: rounds.filter((r) => r.revealedAt !== null).length,
    skipped: summaries.filter((s) => s.kind === 'skipped').length,
  };
  if (gameType === 'DILEMMA') base.same = summaries.filter((s) => s.kind === 'same').length;
  if (gameType === 'WHICH_OF_US') {
    base.unanimous = summaries.filter((s) => s.kind === 'unanimous').length;
    const votesFor: Record<string, number> = {};
    for (const r of rounds) for (const a of Object.values(r.answers)) if (a.kind === 'vote') votesFor[a.userId] = (votesFor[a.userId] ?? 0) + 1;
    base.votesFor = votesFor;
  }
  if (gameType === 'WHO_KNOWS_BEST') {
    const scores: SessionSummary['scores'] = {};
    for (const r of rounds) {
      const subject = r.prompt.subjectUserId;
      const guesser = participantIds.find((id) => id !== subject);
      if (!guesser || !r.result?.verdict) continue;
      const s = (scores[guesser] ??= { exact: 0, close: 0, miss: 0, points: 0 });
      if (r.result.verdict === 'EXACT') (s.exact++, (s.points += 2));
      else if (r.result.verdict === 'CLOSE') (s.close++, (s.points += 1));
      else s.miss++;
    }
    base.scores = scores;
  }
  return base;
}

/** Sélection aléatoire sans remise : les questions non récemment jouées d'abord, puis les anciennes si nécessaire. */
export function pickRandom<T extends { id: string }>(pool: readonly T[], count: number, recentlyUsedIds: ReadonlySet<string>, random: () => number = Math.random): T[] {
  const shuffle = (items: readonly T[]) => {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [copy[i], copy[j]] = [copy[j]!, copy[i]!];
    }
    return copy;
  };
  const fresh = shuffle(pool.filter((q) => !recentlyUsedIds.has(q.id)));
  if (fresh.length >= count) return fresh.slice(0, count);
  const stale = shuffle(pool.filter((q) => recentlyUsedIds.has(q.id)));
  return [...fresh, ...stale.slice(0, count - fresh.length)];
}

/** Répartit les manches « Qui connaît le mieux » : le sujet alterne entre les deux partenaires. */
export function assignSubjects(count: number, participantIds: readonly string[], startWith = 0): string[] {
  return Array.from({ length: count }, (_, i) => participantIds[(i + startWith) % participantIds.length]!);
}

/** Texte amusant d'après le résultat (affiché après révélation, jamais culpabilisant). */
export function funLine(gameType: GameType, summary: RoundSummary, names: Record<string, string>): string {
  switch (summary.kind) {
    case 'same':
      return 'Même choix. Vous êtes sur la même longueur d’onde.';
    case 'different':
      return 'Deux avis différents : voilà une conversation toute trouvée.';
    case 'unanimous':
      return `Unanimité : ${names[summary.detail ?? ''] ?? 'l’un de vous'} ne pourra pas dire le contraire.`;
    case 'split':
      return 'Chacun a voté pour… l’autre ? Ou pour soi ? À débattre.';
    case 'verdict':
      return summary.detail === 'EXACT' ? 'Dans le mille.' : summary.detail === 'CLOSE' ? 'Pas loin du tout.' : 'Raté, mais maintenant vous savez.';
    case 'skipped':
      return 'Question passée, sans regret.';
    default:
      return gameType === 'SECRET_ANSWERS' || gameType === 'CONFESSIONS' ? 'Prenez le temps d’en parler.' : 'Révélé.';
  }
}
