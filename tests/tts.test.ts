import { afterEach, describe, expect, it, vi } from 'vitest';
import { POST } from '@/app/api/tts/route';
import { castVoices } from '@/lib/tts';

function req(body: unknown, headers: Record<string, string> = {}) {
  return new Request('http://x/api/tts', { method: 'POST', body: JSON.stringify(body), headers });
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('castVoices', () => {
  it('gives each speaker a distinct voice of the right type', () => {
    const cast = castVoices([
      { name: 'Maya', voice: 'female' },
      { name: 'Josh', voice: 'male' },
      { name: 'Priya', voice: 'female' },
    ]);
    expect(cast.cloud('Maya')).toBe('en-US-Chirp3-HD-Leda');
    expect(cast.cloud('Josh')).toBe('en-US-Chirp3-HD-Puck');
    expect(cast.cloud('Priya')).toBe('en-US-Chirp3-HD-Aoede');
  });

  it('alternates when voice types are unknown (older dialogues)', () => {
    const cast = castVoices([{ name: 'A' }, { name: 'B' }]);
    expect(cast.cloud('A')).toMatch(/Leda/);
    expect(cast.cloud('B')).toMatch(/Puck/);
  });
});

describe('/api/tts', () => {
  const VOICE = 'en-US-Chirp3-HD-Leda';

  it('501s when no Google key is configured (client falls back to phone voice)', async () => {
    vi.stubEnv('GOOGLE_TTS_API_KEY', '');
    expect((await POST(req({ text: 'hi', voice: VOICE }))).status).toBe(501);
  });

  it('requires the passcode', async () => {
    vi.stubEnv('APP_PASSCODE', 'secret');
    vi.stubEnv('GOOGLE_TTS_API_KEY', 'g');
    expect((await POST(req({ text: 'hi', voice: VOICE }))).status).toBe(401);
  });

  it('rejects voices outside the allowed set', async () => {
    vi.stubEnv('GOOGLE_TTS_API_KEY', 'g');
    expect((await POST(req({ text: 'hi', voice: 'en-US-Wavenet-A' }))).status).toBe(400);
  });

  it('calls Google and returns MP3 bytes', async () => {
    vi.stubEnv('GOOGLE_TTS_API_KEY', 'g-key');
    const fetchMock = vi.fn(async () => Response.json({ audioContent: Buffer.from('MP3DATA').toString('base64') }));
    vi.stubGlobal('fetch', fetchMock);
    const res = await POST(req({ text: "I'm down!", voice: VOICE }));
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('audio/mpeg');
    expect(Buffer.from(await res.arrayBuffer()).toString()).toBe('MP3DATA');
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://texttospeech.googleapis.com/v1/text:synthesize');
    expect((init.headers as Record<string, string>)['x-goog-api-key']).toBe('g-key');
    expect(JSON.parse(init.body as string)).toEqual({
      input: { text: "I'm down!" },
      voice: { languageCode: 'en-US', name: VOICE },
      audioConfig: { audioEncoding: 'MP3' },
    });
  });

  it("passes Google's error reason through", async () => {
    vi.stubEnv('GOOGLE_TTS_API_KEY', 'bad');
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ error: { message: 'API key not valid.' } }, { status: 400 })));
    const res = await POST(req({ text: 'hi', voice: VOICE }));
    expect(res.status).toBe(502);
    expect((await res.json()).error).toMatch(/API key not valid/);
  });
});
