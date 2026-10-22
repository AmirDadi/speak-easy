/**
 * Spaced repetition (a simplified SM-2). Pure — no storage, no Date.now();
 * callers pass `today` so this is deterministic and testable.
 */
import { LEARNING_CONFIG } from './config';
import { addDays } from './dates';

export interface SrsState {
  /** Days until next review. 0 = brand new. */
  interval: number;
  ease: number;
  reps: number;
  lapses: number;
  /** ISO date (YYYY-MM-DD) the card is next due. */
  due: string;
}

export function newSrsState(today: string): SrsState {
  return { interval: 0, ease: 2.5, reps: 0, lapses: 0, due: today };
}

/**
 * Apply a 0-5 grade. Below the pass grade the card comes back tomorrow and
 * gets harder-weighted; at or above, the interval grows by `ease`.
 */
export function computeNextReview(state: SrsState, grade: number, today: string): SrsState {
  const g = Math.max(0, Math.min(5, Math.round(grade)));
  const ease = Math.max(1.3, state.ease + (0.1 - (5 - g) * (0.08 + (5 - g) * 0.02)));

  if (g < LEARNING_CONFIG.VOCAB_PASS_GRADE) {
    return { interval: 1, ease, reps: 0, lapses: state.lapses + 1, due: addDays(today, 1) };
  }

  const reps = state.reps + 1;
  const interval = reps === 1 ? 1 : reps === 2 ? 3 : Math.round(Math.max(state.interval, 1) * ease);
  return { interval, ease, reps, lapses: state.lapses, due: addDays(today, interval) };
}

export function isDue(state: SrsState, today: string): boolean {
  return state.due <= today;
}

export function isMastered(state: SrsState): boolean {
  return state.interval >= LEARNING_CONFIG.MASTERED_INTERVAL_DAYS;
}
