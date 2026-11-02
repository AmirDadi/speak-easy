import { NextResponse } from 'next/server';
import { passcodeOk } from '@/lib/route';
import { TtsRequestSchema } from '@/lib/schemas';

export const maxDuration = 30;

const ENDPOINT = 'https://texttospeech.googleapis.com/v1/text:synthesize';

/**
 * Google Cloud Text-to-Speech (Chirp 3 HD) → MP3. Returns 501 when no key is
 * configured so the client falls back to the phone's built-in voice instead
 * of showing an error.
 */
export async function POST(req: Request) {
  if (!passcodeOk(req)) {
    return NextResponse.json({ error: 'Wrong or missing passcode.' }, { status: 401 });
  }
  const key = process.env.GOOGLE_TTS_API_KEY;
  if (!key) {
    return NextResponse.json({ error: 'Cloud voices are not configured.' }, { status: 501 });
  }
  const parsed = TtsRequestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({
      input: { text: parsed.data.text },
      voice: { languageCode: 'en-US', name: parsed.data.voice },
      audioConfig: { audioEncoding: 'MP3' },
    }),
  });
  const data = (await res.json().catch(() => ({}))) as { audioContent?: string; error?: { message?: string } };
  if (!res.ok || !data.audioContent) {
    // Surface Google's reason (e.g. "API not enabled", "API key not valid") —
    // it's the only way to debug a misconfigured key from the phone.
    return NextResponse.json({ error: `Google TTS: ${data.error?.message ?? `HTTP ${res.status}`}` }, { status: 502 });
  }
  return new Response(new Uint8Array(Buffer.from(data.audioContent, 'base64')), {
    headers: { 'content-type': 'audio/mpeg', 'cache-control': 'private, max-age=31536000, immutable' },
  });
}
