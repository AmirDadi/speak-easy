/**
 * The app's entire persisted state (stored on-device) and pure helpers over
 * it. No `window` or localStorage here — see lib/storage.ts for that.
 */
import type { Phrase, RoleplayFeedback, Shadowing, SpeakingReport, SpeakingTopic, LearnerContext } from './schemas';
import { newSrsState, isDue, isMastered, type SrsState } from './srs';
import { daysBetween } from './dates';
import { LEARNING_CONFIG } from './config';

export interface VocabCard {
  id: string;
  phrase: string;
  meaning: string;
  example: string;
  register: string;
  source: 'shadowing' | 'speaking' | 'social' | 'onboarding' | 'import' | 'manual';
  addedAt: string;
  srs: SrsState;
  lastAnswer?: { date: string; text: string; score: number; nativeVersion: string };
}

export interface ShadowingDay {
  date: string;
  dialogue: Shadowing;
  /** Best match ratio per line index. */
  lineScores: Record<number, number>;
  done: boolean;
}

export interface SpeakingEntry {
  date: string;
  topic: SpeakingTopic;
  transcript: string;
  durationSec: number;
  report: SpeakingReport;
}

export interface SocialEntry {
  date: string;
  scenarioId: string;
  feedback: RoleplayFeedback;
}

export interface AppState {
  version: 1;
  profile: {
    onboarded: boolean;
    level: string;
    goals: string;
    interests: string;
    notes: string;
    weakAreas: string[];
    passcode: string;
  };
  /** Phrases the learner already knows (from the checklist/imports) — never taught as new. */
  knownPhrases: string[];
  vocab: Record<string, VocabCard>;
  shadowing: ShadowingDay[];
  speaking: { pendingTopic: { date: string; topic: SpeakingTopic } | null; entries: SpeakingEntry[] };
  social: SocialEntry[];
  completedLessons: string[];
  activity: string[];
}

export function createInitialState(): AppState {
  return {
    version: 1,
    profile: { onboarded: false, level: '', goals: '', interests: '', notes: '', weakAreas: [], passcode: '' },
    knownPhrases: [],
    vocab: {},
    shadowing: [],
    speaking: { pendingTopic: null, entries: [] },
    social: [],
    completedLessons: [],
    activity: [],
  };
}

export function phraseId(phrase: string): string {
  return phrase.trim().toLowerCase().replace(/\s+/g, ' ');
}

/** Add phrases to the vocab bank, skipping ones already present or already known. */
export function addPhrases(state: AppState, phrases: Phrase[], source: VocabCard['source'], today: string): AppState {
  const known = new Set(state.knownPhrases.map(phraseId));
  const vocab = { ...state.vocab };
  for (const p of phrases) {
    const id = phraseId(p.phrase);
    if (!id || vocab[id] || known.has(id)) continue;
    vocab[id] = { id, ...p, source, addedAt: today, srs: newSrsState(today) };
  }
  return { ...state, vocab };
}

export function mergeWeakAreas(existing: string[], incoming: string[], max = 12): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  // Newest first so stale weaknesses age out.
  for (const w of [...incoming, ...existing]) {
    const key = w.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(w.trim());
  }
  return out.slice(0, max);
}

export function markActive(state: AppState, today: string): AppState {
  if (state.activity.includes(today)) return state;
  return { ...state, activity: [...state.activity, today].slice(-400) };
}

export function getDueCards(state: AppState, today: string): VocabCard[] {
  return Object.values(state.vocab)
    .filter((c) => isDue(c.srs, today))
    .sort((a, b) => a.srs.due.localeCompare(b.srs.due) || a.srs.interval - b.srs.interval);
}

export function getTodayShadowing(state: AppState, today: string): ShadowingDay | undefined {
  return state.shadowing.find((s) => s.date === today);
}

export function getLastSpeaking(state: AppState): SpeakingEntry | undefined {
  return state.speaking.entries[state.speaking.entries.length - 1];
}

export function isSpeakingDue(state: AppState, today: string): boolean {
  const last = getLastSpeaking(state);
  return !last || daysBetween(last.date, today) >= LEARNING_CONFIG.SPEAKING_INTERVAL_DAYS;
}

/**
 * Compact summary of what the learner knows, sent with every AI request so
 * Claude can avoid re-teaching known phrases and target weak spots.
 */
export function buildLearnerContext(state: AppState): LearnerContext {
  const cards = Object.values(state.vocab);
  const mastered = cards.filter((c) => isMastered(c.srs)).map((c) => c.phrase);
  const learning = cards
    .filter((c) => !isMastered(c.srs))
    .sort((a, b) => b.addedAt.localeCompare(a.addedAt))
    .map((c) => c.phrase);
  return {
    level: state.profile.level,
    goals: state.profile.goals,
    interests: state.profile.interests,
    knownPhrases: [...state.knownPhrases, ...mastered].slice(-400),
    learningPhrases: learning.slice(0, 200),
    weakAreas: state.profile.weakAreas.slice(0, 30),
    notes: state.profile.notes.slice(0, 4000),
  };
}
