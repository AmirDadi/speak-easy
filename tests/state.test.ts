import { describe, expect, it } from 'vitest';
import { addPhrases, buildLearnerContext, createInitialState, getDueCards, getNextAudience, getNextExplainPart, isExplainDue, isSpeakingDue, mergeWeakAreas } from '@/lib/state';

const TODAY = '2026-10-22';
const p = (phrase: string) => ({ phrase, meaning: 'm', example: 'e', register: 'casual' });

describe('state helpers', () => {
  it('addPhrases skips duplicates and already-known phrases', () => {
    const s0 = { ...createInitialState(), knownPhrases: ["I'm down"] };
    const s1 = addPhrases(s0, [p("i'm DOWN"), p('rain check'), p('Rain  check')], 'shadowing', TODAY);
    expect(Object.keys(s1.vocab)).toEqual(['rain check']);
  });

  it('new cards are due today', () => {
    const s = addPhrases(createInitialState(), [p('wing it')], 'manual', TODAY);
    expect(getDueCards(s, TODAY)).toHaveLength(1);
  });

  it('mergeWeakAreas puts newest first and dedupes case-insensitively', () => {
    expect(mergeWeakAreas(['Articles', 'Tenses'], ['articles', 'Prepositions'])).toEqual(['articles', 'Prepositions', 'Tenses']);
  });

  it('speaking is due when never done or a week has passed', () => {
    const s = createInitialState();
    expect(isSpeakingDue(s, TODAY)).toBe(true);
    const withEntry = {
      ...s,
      speaking: { pendingTopic: null, entries: [{ date: '2026-10-20' } as never] },
    };
    expect(isSpeakingDue(withEntry, TODAY)).toBe(false);
    expect(isSpeakingDue(withEntry, '2026-10-27')).toBe(true);
  });

  it('learner context separates known from learning phrases', () => {
    const s = addPhrases({ ...createInitialState(), knownPhrases: ['no worries'] }, [p('low-key')], 'manual', TODAY);
    const ctx = buildLearnerContext(s);
    expect(ctx.knownPhrases).toEqual(['no worries']);
    expect(ctx.learningPhrases).toEqual(['low-key']);
  });
});

describe('explain helpers', () => {
  const withSubject = (entries: { part: string; date: string }[]) => ({
    ...createInitialState(),
    explain: {
      subject: { name: 'AIR', description: '', parts: ['Overview', 'How it works', 'Pricing'] },
      entries: entries as never[],
    },
  });

  it('is due every other day', () => {
    expect(isExplainDue(withSubject([]), TODAY)).toBe(true);
    expect(isExplainDue(withSubject([{ part: 'Overview', date: '2026-10-21' }]), TODAY)).toBe(false);
    expect(isExplainDue(withSubject([{ part: 'Overview', date: '2026-10-20' }]), TODAY)).toBe(true);
  });

  it('picks never-explained parts first, then the least recent', () => {
    expect(getNextExplainPart(withSubject([]))).toBe('Overview');
    expect(getNextExplainPart(withSubject([{ part: 'Overview', date: 'x' }]))).toBe('How it works');
    const all = withSubject([
      { part: 'How it works', date: 'a' },
      { part: 'Overview', date: 'b' },
      { part: 'Pricing', date: 'c' },
    ]);
    expect(getNextExplainPart(all)).toBe('How it works');
  });

  it('rotates audiences', () => {
    const aud = ['a', 'b'] as const;
    expect(getNextAudience(withSubject([]), aud)).toBe('a');
    expect(getNextAudience(withSubject([{ part: 'x', date: 'y' }]), aud)).toBe('b');
  });
});
