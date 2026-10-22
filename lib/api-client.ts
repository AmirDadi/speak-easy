'use client';
/**
 * Browser → our API routes. Attaches the passcode (if set) so a deployed copy
 * can't be used by strangers to spend the owner's API key.
 */
import { getStateSnapshot } from './storage';

export async function callApi<T>(path: string, body: unknown): Promise<T> {
  const passcode = getStateSnapshot().profile.passcode;
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(passcode ? { 'x-app-passcode': passcode } : {}) },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
  return data as T;
}
