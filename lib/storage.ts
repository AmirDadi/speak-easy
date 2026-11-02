'use client';
/**
 * On-device persistence (localStorage) exposed as a React hook. Every read and
 * write is wrapped in try/catch: storage can be unavailable (private mode,
 * quota) and the app must still work for the current visit.
 */
import { useCallback, useSyncExternalStore } from 'react';
import { createInitialState, type AppState } from './state';

const KEY = 'speak-easy:v1';
// Keep the stored blob small: old dialogues are the bulk of it.
const MAX_SHADOWING_DAYS = 30;

let cache: AppState | null = null;
const listeners = new Set<() => void>();

function read(): AppState {
  if (cache) return cache;
  try {
    const raw = window.localStorage.getItem(KEY);
    cache = raw ? { ...createInitialState(), ...(JSON.parse(raw) as AppState) } : createInitialState();
  } catch {
    cache = createInitialState();
  }
  return cache;
}

function write(next: AppState) {
  const trimmed = { ...next, shadowing: next.shadowing.slice(-MAX_SHADOWING_DAYS) };
  cache = trimmed;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(trimmed));
  } catch {
    // Storage full or blocked — state still lives in memory for this visit.
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const SERVER_SNAPSHOT = createInitialState();

/** Returns `[state, update, hydrated]`. `update` takes a pure reducer. */
export function useAppState(): [AppState, (fn: (s: AppState) => AppState) => void, boolean] {
  const state = useSyncExternalStore(subscribe, read, () => SERVER_SNAPSHOT);
  const hydrated = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const update = useCallback((fn: (s: AppState) => AppState) => write(fn(read())), []);
  return [state, update, hydrated];
}

export function getStateSnapshot(): AppState {
  return read();
}

export function setPasscode(passcode: string) {
  const s = read();
  write({ ...s, profile: { ...s.profile, passcode } });
}

// ---------------------------------------------------------------------------
// Onboarding draft: kept separately so a failed request, reload or closed app
// never loses what the user already typed or said during setup.
// ---------------------------------------------------------------------------

const DRAFT_KEY = 'speak-easy:onboarding-draft';

export function loadDraft<T>(): T | null {
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function saveDraft(draft: unknown) {
  try {
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // Best effort only.
  }
}

export function clearDraft() {
  try {
    window.localStorage.removeItem(DRAFT_KEY);
  } catch {
    // Ignore.
  }
}

export function exportBackup(): string {
  return JSON.stringify(read(), null, 2);
}

export function importBackup(json: string): { ok: true } | { ok: false; error: string } {
  try {
    const parsed = JSON.parse(json) as Partial<AppState>;
    if (parsed.version !== 1 || typeof parsed.vocab !== 'object') {
      return { ok: false, error: 'This does not look like a Speak Easy backup.' };
    }
    write({ ...createInitialState(), ...parsed } as AppState);
    return { ok: true };
  } catch {
    return { ok: false, error: 'Could not read that file.' };
  }
}

export function resetAll() {
  write(createInitialState());
}
