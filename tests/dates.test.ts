import { describe, expect, it } from 'vitest';
import { addDays, computeStreak, daysBetween } from '@/lib/dates';

describe('dates', () => {
  it('adds days across month boundaries', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('counts days between', () => {
    expect(daysBetween('2026-10-15', '2026-10-22')).toBe(7);
  });

  it('computes a streak that survives until a full day is missed', () => {
    expect(computeStreak(['2026-10-20', '2026-10-21', '2026-10-22'], '2026-10-22')).toBe(3);
    expect(computeStreak(['2026-10-20', '2026-10-21'], '2026-10-22')).toBe(2);
    expect(computeStreak(['2026-10-19'], '2026-10-22')).toBe(0);
  });
});
