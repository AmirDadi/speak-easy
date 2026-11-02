'use client';
/**
 * Browser → our API routes. Attaches the passcode (if set) so a deployed copy
 * can't be used by strangers to spend the owner's API key.
 */
import { getStateSnapshot, setPasscode } from './storage';

function send(path: string, body: unknown, passcode: string) {
  return fetch(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(passcode ? { 'x-app-passcode': passcode } : {}) },
    body: JSON.stringify(body),
  });
}

/**
 * POST with the stored passcode. On a 401 (missing or wrong passcode), asks
 * once and retries, instead of failing with an error the user can't fix from
 * where they are (e.g. during onboarding, before Profile is reachable).
 */
export async function authedPost(path: string, body: unknown): Promise<Response> {
  let res = await send(path, body, getStateSnapshot().profile.passcode);
  if (res.status === 401) {
    const entered = window.prompt('Enter the app passcode:')?.trim();
    if (entered) {
      res = await send(path, body, entered);
      if (res.ok) setPasscode(entered);
    }
  }
  return res;
}

export async function callApi<T>(path: string, body: unknown): Promise<T> {
  const res = await authedPost(path, body);
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  if (res.status === 401) throw new Error('Wrong passcode. Check it and try again.');
  if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
  return data as T;
}

export async function isPasscodeRequired(): Promise<boolean> {
  try {
    const res = await fetch('/api/status');
    return ((await res.json()) as { passcodeRequired?: boolean }).passcodeRequired === true;
  } catch {
    return false;
  }
}

export async function checkPasscode(passcode: string): Promise<boolean> {
  return (await send('/api/auth/check', {}, passcode)).ok;
}
