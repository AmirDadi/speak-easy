/**
 * All tunables in one place. Don't hardcode these anywhere else.
 */

export const AI_CONFIG = {
  MODEL: 'claude-opus-5-5',
  MAX_TOKENS: 16000,
} as const;

export const LEARNING_CONFIG = {
  /** New phrases introduced in each daily shadowing dialogue. */
  PHRASES_PER_DIALOGUE: '5-7',
  /** Max vocab cards reviewed per session (due cards first). */
  VOCAB_SESSION_SIZE: 8,
  /** Days between required speaking sessions. */
  SPEAKING_INTERVAL_DAYS: 7,
  /** Speaking session target length in seconds. */
  SPEAKING_TARGET_SEC: 150,
  SPEAKING_PREP_SEC: 60,
  /** "Explain AIR" sessions: every other day, ~5 minutes. */
  EXPLAIN_INTERVAL_DAYS: 2,
  EXPLAIN_TARGET_SEC: 300,
  EXPLAIN_PREP_SEC: 30,
  /** Shadowing: a line counts as "nailed" at or above this word-match ratio. */
  SHADOW_PASS_RATIO: 0.85,
  /** Grade (0-5) at or above which a vocab card counts as a successful recall. */
  VOCAB_PASS_GRADE: 3,
  /** A phrase is "known" once its SRS interval reaches this many days. */
  MASTERED_INTERVAL_DAYS: 21,
  /** Speech rate presets for text-to-speech. */
  TTS_RATES: [0.75, 0.9, 1.0] as const,
} as const;
