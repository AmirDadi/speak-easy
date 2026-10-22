import { describe, expect, it } from 'vitest';
import { compareSpeech, normalizeWords } from '@/lib/compare';

describe('normalizeWords', () => {
  it('strips punctuation and expands reductions', () => {
    expect(normalizeWords("I'm gonna grab coffee, okay?")).toEqual(["i'm", 'going', 'to', 'grab', 'coffee', 'okay']);
  });
});

describe('compareSpeech', () => {
  it('gives a perfect score for an exact repeat', () => {
    const r = compareSpeech('No way, that is wild!', 'no way that is wild');
    expect(r.ratio).toBe(1);
    expect(r.words.every((w) => w.matched)).toBe(true);
  });

  it('a single missed word does not cascade', () => {
    const r = compareSpeech('I was gonna say the same thing', 'I was say the same thing');
    expect(r.words.map((w) => w.matched)).toEqual([true, true, false, true, true, true, true]);
  });

  it('treats a recogniser expanding "gonna" as a match', () => {
    const r = compareSpeech("I'm gonna head out", "I'm going to head out");
    expect(r.ratio).toBe(1);
  });

  it('reports extra spoken words', () => {
    const r = compareSpeech('See you later', 'okay see you later man');
    expect(r.ratio).toBe(1);
    expect(r.extra).toEqual(['okay', 'man']);
  });

  it('handles empty speech', () => {
    const r = compareSpeech('Hello there', '');
    expect(r.ratio).toBe(0);
  });
});
