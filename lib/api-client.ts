'use client';
/**
 * Browser → our API routes. Attaches the passcode (if set) so a deployed copy
 * can't be used by strangers to spend the owner's API key.
 */
import { getStateSnapshot, setPasscode } from './storage';

async function post(path: string, body: unknown, passcode: string) {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(passcode ? { 'x-app-passcode': passcode } : {}) },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  return { res, data };
}

export async function callApi<T>(path: string, body: unknown): Promise<T> {
  let { res, data } = await post(path, body, getStateSnapshot().profile.passcode);

  // Missing or wrong passcode: ask once and retry, instead of failing with an
  // error the user can't fix from where they are (e.g. during onboarding,
  // before Profile is reachable).
  if (res.status === 401) {
    const entered = window.prompt('Enter the app passcode:')?.trim();
    if (entered) {
      ({ res, data } = await post(path, body, entered));
      if (res.ok) setPasscode(entered);
    }
  }

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
  const { res } = await post('/api/auth/check', {}, passcode);
  return res.ok;
}
