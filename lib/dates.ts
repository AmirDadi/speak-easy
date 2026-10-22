/**
 * Local-calendar date helpers. Dates are ISO `YYYY-MM-DD` strings in the
 * user's local time zone so "today" flips at the user's midnight, not UTC's.
 */

export function getLocalDate(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  // Noon avoids DST edges shifting the date.
  const date = new Date(y, m - 1, d, 12);
  date.setDate(date.getDate() + days);
  return getLocalDate(date);
}

export function daysBetween(fromIso: string, toIso: string): number {
  const [y1, m1, d1] = fromIso.split('-').map(Number);
  const [y2, m2, d2] = toIso.split('-').map(Number);
  const a = Date.UTC(y1, m1 - 1, d1);
  const b = Date.UTC(y2, m2 - 1, d2);
  return Math.round((b - a) / 86_400_000);
}

/**
 * Consecutive-day streak ending today (or yesterday — the streak isn't broken
 * until a full day is missed).
 */
export function computeStreak(activeDates: string[], today: string): number {
  const set = new Set(activeDates);
  let cursor = set.has(today) ? today : addDays(today, -1);
  let streak = 0;
  while (set.has(cursor)) {
    streak++;
    cursor = addDays(cursor, -1);
  }
  return streak;
}
