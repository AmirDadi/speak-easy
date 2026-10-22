import { describe, expect, it } from 'vitest';
import { computeNextReview, isDue, isMastered, newSrsState } from '@/lib/srs';

const TODAY = '2026-10-22';

describe('computeNextReview', () => {
  it('schedules a new card for tomorrow on first success', () => {
    const next = computeNextReview(newSrsState(TODAY), 5, TODAY);
    expect(next.interval).toBe(1);
    expect(next.due).toBe('2026-10-23');
    expect(next.reps).toBe(1);
  });

  it('grows the interval on repeated success', () => {
    let s = newSrsState(TODAY);
    s = computeNextReview(s, 5, TODAY);
    s = computeNextReview(s, 5, TODAY);
    expect(s.interval).toBe(3);
    s = computeNextReview(s, 5, TODAY);
    expect(s.interval).toBeGreaterThan(3);
  });

  it('resets and counts a lapse on a failing grade', () => {
    let s = newSrsState(TODAY);
    for (let k = 0; k < 4; k++) s = computeNextReview(s, 5, TODAY);
    const failed = computeNextReview(s, 1, TODAY);
    expect(failed.interval).toBe(1);
    expect(failed.reps).toBe(0);
    expect(failed.lapses).toBe(1);
    expect(failed.ease).toBeLessThan(s.ease);
  });

  it('never lets ease drop below 1.3', () => {
    let s = newSrsState(TODAY);
    for (let k = 0; k < 20; k++) s = computeNextReview(s, 0, TODAY);
    expect(s.ease).toBeGreaterThanOrEqual(1.3);
  });

  it('reports due and mastered correctly', () => {
    const s = newSrsState(TODAY);
    expect(isDue(s, TODAY)).toBe(true);
    expect(isDue({ ...s, due: '2026-10-25' }, TODAY)).toBe(false);
    expect(isMastered({ ...s, interval: 30 })).toBe(true);
  });
});
