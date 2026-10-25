import { describe, expect, it } from 'vitest';
import { assignSubjects, canReveal, isSessionComplete, nextOpenRoundIndex, pickRandom, type RoundState, summarizeSession, validateAnswer } from './index';

const A = 'user-a';
const B = 'user-b';
const round = (index: number, answers: RoundState['answers'] = {}, extra: Partial<RoundState> = {}): RoundState => ({
  index, prompt: { text: 'Q', options: ['Un an autour du monde', 'La maison de nos rêves'] }, answers, revealedAt: null, result: null, ...extra,
});

describe('game-engine', () => {
  it('ne révèle que lorsque les deux ont répondu', () => {
    expect(canReveal(round(0, { [A]: { kind: 'text', text: 'x' } }), [A, B])).toBe(false);
    expect(canReveal(round(0, { [A]: { kind: 'text', text: 'x' }, [B]: { kind: 'text', text: 'y' } }), [A, B])).toBe(true);
    expect(canReveal(round(0, { [A]: { kind: 'text', text: 'x' } }), [A])).toBe(false);
  });

  it('valide la forme des réponses', () => {
    expect(validateAnswer('DILEMMA', round(0), { kind: 'choice', index: 1 }, [A, B], A)).toBeNull();
    expect(validateAnswer('DILEMMA', round(0), { kind: 'choice', index: 2 }, [A, B], A)).not.toBeNull();
    expect(validateAnswer('DILEMMA', round(0), { kind: 'text', text: 'x' }, [A, B], A)).not.toBeNull();
    expect(validateAnswer('WHICH_OF_US', round(0), { kind: 'vote', userId: 'z' }, [A, B], A)).not.toBeNull();
    expect(validateAnswer('SECRET_ANSWERS', round(0), { kind: 'text', text: '   ' }, [A, B], A)).not.toBeNull();
  });

  it('résume une partie de dilemmes et de votes', () => {
    const rounds = [
      round(0, { [A]: { kind: 'choice', index: 0 }, [B]: { kind: 'choice', index: 0 } }, { revealedAt: new Date() }),
      round(1, { [A]: { kind: 'choice', index: 1 }, [B]: { kind: 'choice', index: 0 } }, { revealedAt: new Date() }),
      round(2, {}, { result: { skipped: true } }),
    ];
    expect(isSessionComplete(rounds)).toBe(true);
    expect(summarizeSession('DILEMMA', rounds, [A, B])).toMatchObject({ total: 3, revealed: 2, skipped: 1, same: 1 });
    const votes = [round(0, { [A]: { kind: 'vote', userId: B }, [B]: { kind: 'vote', userId: B } }, { revealedAt: new Date() })];
    expect(summarizeSession('WHICH_OF_US', votes, [A, B])).toMatchObject({ unanimous: 1, votesFor: { [B]: 2 } });
  });

  it('calcule les scores « Qui connaît le mieux »', () => {
    const rounds = [
      round(0, {}, { prompt: { text: 'q', subjectUserId: A }, revealedAt: new Date(), result: { verdict: 'EXACT' } }),
      round(1, {}, { prompt: { text: 'q', subjectUserId: B }, revealedAt: new Date(), result: { verdict: 'CLOSE' } }),
      round(2, {}, { prompt: { text: 'q', subjectUserId: A }, revealedAt: new Date(), result: { verdict: 'MISS' } }),
    ];
    const s = summarizeSession('WHO_KNOWS_BEST', rounds, [A, B]).scores!;
    expect(s[B]).toEqual({ exact: 1, close: 0, miss: 1, points: 2 });
    expect(s[A]).toEqual({ exact: 0, close: 1, miss: 0, points: 1 });
    expect(nextOpenRoundIndex(rounds)).toBeNull();
  });

  it('pioche en évitant les questions récentes et alterne les sujets', () => {
    const pool = Array.from({ length: 6 }, (_, i) => ({ id: `q${i}` }));
    const picked = pickRandom(pool, 3, new Set(['q0', 'q1', 'q2']), () => 0.5);
    expect(picked.every((q) => ['q3', 'q4', 'q5'].includes(q.id))).toBe(true);
    const forced = pickRandom(pool, 5, new Set(['q0', 'q1', 'q2']), () => 0.1);
    expect(forced).toHaveLength(5);
    expect(forced.slice(0, 3).every((q) => ['q3', 'q4', 'q5'].includes(q.id))).toBe(true);
    expect(assignSubjects(4, [A, B])).toEqual([A, B, A, B]);
  });
});
