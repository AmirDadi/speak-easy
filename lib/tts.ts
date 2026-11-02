'use client';
/**
 * Natural-sounding dialogue audio. Lines are synthesized once by Google Cloud
 * TTS (via /api/tts), cached on the device (Cache Storage), and played through
 * a single <audio> element so speed changes are free and instant.
 *
 * If cloud voices aren't configured or a request fails, we fall back to the
 * phone's built-in voice so practice never blocks on audio.
 */
import { authedPost } from './api-client';
import { TTS_CONFIG } from './config';
import { getUsVoices, speak, stopSpeaking } from './speech';

export type VoiceType = 'female' | 'male';

export interface Cast {
  /** Cloud voice name for a speaker. */
  cloud: (speaker: string) => string;
  /** Browser fallback voice for a speaker. */
  local: (speaker: string) => SpeechSynthesisVoice | null;
}

/**
 * Give each speaker a distinct voice: the n-th female speaker gets the n-th
 * female voice, etc. Speakers without a known type alternate.
 */
export function castVoices(speakers: { name: string; voice?: VoiceType }[]): Cast {
  const counts = { female: 0, male: 0 };
  const cloud = new Map<string, string>();
  const order = new Map<string, number>();
  speakers.forEach((s, i) => {
    const type: VoiceType = s.voice ?? (i % 2 === 0 ? 'female' : 'male');
    const pool = TTS_CONFIG.VOICES[type];
    cloud.set(s.name, pool[counts[type]++ % pool.length]);
    order.set(s.name, i);
  });
  return {
    cloud: (speaker) => cloud.get(speaker) ?? TTS_CONFIG.VOICES.female[0],
    local: (speaker) => {
      const voices = getUsVoices();
      return voices.length ? voices[(order.get(speaker) ?? 0) % voices.length] : null;
    },
  };
}

const CACHE_NAME = 'speak-easy-tts-v1';
const memory = new Map<string, string>(); // cache key → object URL
const inflight = new Map<string, Promise<string | null>>();
// After a 501 (not configured) or repeated failures, stop asking the server.
let cloudDisabled = false;
let failures = 0;

async function cacheKey(text: string, voice: string): Promise<string> {
  const bytes = new TextEncoder().encode(`${voice}\n${text}`);
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  const hex = Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, '0')).join('');
  return `/tts-cache/${hex}.mp3`;
}

async function fetchAudioUrl(text: string, voice: string): Promise<string | null> {
  if (cloudDisabled) return null;
  const key = await cacheKey(text, voice);
  const hit = memory.get(key);
  if (hit) return hit;

  let cache: Cache | null = null;
  try {
    cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(key);
    if (cached) {
      const url = URL.createObjectURL(await cached.blob());
      memory.set(key, url);
      return url;
    }
  } catch {
    // Cache Storage unavailable (private mode): still works, just not offline.
  }

  const res = await authedPost('/api/tts', { text: text.slice(0, TTS_CONFIG.MAX_CHARS), voice });
  if (res.status === 501) {
    cloudDisabled = true;
    return null;
  }
  if (!res.ok) {
    if (++failures >= 3) cloudDisabled = true;
    return null;
  }
  failures = 0;
  const blob = await res.blob();
  try {
    await cache?.put(key, new Response(blob, { headers: { 'content-type': 'audio/mpeg' } }));
  } catch {
    // Quota exceeded etc. — fine, we still have it in memory.
  }
  const url = URL.createObjectURL(blob);
  memory.set(key, url);
  return url;
}

function getAudioUrl(text: string, voice: string): Promise<string | null> {
  const id = `${voice}\n${text}`;
  let p = inflight.get(id);
  if (!p) {
    p = fetchAudioUrl(text, voice).catch(() => null);
    inflight.set(id, p);
    void p.finally(() => inflight.delete(id));
  }
  return p;
}

/** Warm the cache for a whole dialogue, a few lines at a time. */
export async function prefetch(items: { text: string; voice: string }[], concurrency = 3): Promise<void> {
  const queue = [...items];
  await Promise.all(
    Array.from({ length: concurrency }, async () => {
      while (queue.length && !cloudDisabled) {
        const item = queue.shift()!;
        await getAudioUrl(item.text, item.voice);
      }
    }),
  );
}

// One shared element: iOS only lets audio play after a user tap, and keeping
// the same element keeps it "unlocked" for the following lines.
let audioEl: HTMLAudioElement | null = null;
let unlocked = false;
let stopCurrent: (() => void) | null = null;

function getAudioEl(): HTMLAudioElement {
  if (!audioEl) {
    audioEl = new Audio();
    audioEl.preload = 'auto';
  }
  return audioEl;
}

/** A tiny silent WAV, played synchronously inside the first tap to unlock iOS audio. */
function silentWavUrl(): string {
  const samples = 800; // 0.1s at 8kHz, 8-bit mono
  const buf = new Uint8Array(44 + samples);
  const view = new DataView(buf.buffer);
  const ascii = (o: number, str: string) => [...str].forEach((c, i) => (buf[o + i] = c.charCodeAt(0)));
  ascii(0, 'RIFF');
  view.setUint32(4, 36 + samples, true);
  ascii(8, 'WAVEfmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, 8000, true);
  view.setUint32(28, 8000, true);
  view.setUint16(32, 1, true);
  view.setUint16(34, 8, true);
  ascii(36, 'data');
  view.setUint32(40, samples, true);
  buf.fill(128, 44); // 8-bit silence
  return URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }));
}

function unlockAudio() {
  if (unlocked) return;
  unlocked = true;
  const el = getAudioEl();
  el.src = silentWavUrl();
  el.play().catch(() => {
    unlocked = false;
  });
}

/** Play one line in the speaker's voice. Resolves when it finishes or is stopped. */
export async function say(
  text: string,
  opts: { voice: string; fallbackVoice?: SpeechSynthesisVoice | null; rate?: number },
): Promise<void> {
  stopAudio();
  // Must run before the first await so it's still inside the user's tap.
  unlockAudio();
  const el = getAudioEl();
  const url = await getAudioUrl(text, opts.voice);
  if (!url) return speak(text, { rate: opts.rate, voice: opts.fallbackVoice });

  return new Promise<void>((resolve) => {
    const done = () => {
      el.onended = null;
      el.onerror = null;
      stopCurrent = null;
      resolve();
    };
    stopCurrent = () => {
      el.pause();
      done();
    };
    el.onended = done;
    el.onerror = () => {
      done();
    };
    el.src = url;
    el.preservesPitch = true;
    el.playbackRate = opts.rate ?? 1;
    el.play().catch(() => {
      // Autoplay blocked or decode error → use the phone's voice instead.
      el.onended = null;
      el.onerror = null;
      void speak(text, { rate: opts.rate, voice: opts.fallbackVoice }).then(done);
    });
  });
}

export function stopAudio() {
  stopCurrent?.();
  stopSpeaking();
}
