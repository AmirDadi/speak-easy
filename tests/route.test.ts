import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { createRoute } from '@/lib/route';

const handler = vi.fn(async (b: { n: number }) => ({ doubled: b.n * 2 }));
const POST = createRoute(z.object({ n: z.number() }), handler);

function req(body: unknown, headers: Record<string, string> = {}) {
  return new Request('http://x/api', { method: 'POST', body: JSON.stringify(body), headers });
}

afterEach(() => {
  vi.unstubAllEnvs();
  handler.mockClear();
});

describe('createRoute', () => {
  it('rejects a wrong passcode when APP_PASSCODE is set', async () => {
    vi.stubEnv('APP_PASSCODE', 'secret');
    vi.stubEnv('ANTHROPIC_API_KEY', 'k');
    expect((await POST(req({ n: 1 }, { 'x-app-passcode': 'nope' }))).status).toBe(401);
    expect((await POST(req({ n: 1 }))).status).toBe(401);
    expect(handler).not.toHaveBeenCalled();
  });

  it('accepts the right passcode', async () => {
    vi.stubEnv('APP_PASSCODE', 'secret');
    vi.stubEnv('ANTHROPIC_API_KEY', 'k');
    const res = await POST(req({ n: 2 }, { 'x-app-passcode': 'secret' }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ doubled: 4 });
  });

  it('400s on an invalid body', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'k');
    expect((await POST(req({ n: 'two' }))).status).toBe(400);
  });

  it('500s with a clear message when the API key is missing', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', '');
    const res = await POST(req({ n: 1 }));
    expect(res.status).toBe(500);
    expect((await res.json()).error).toMatch(/ANTHROPIC_API_KEY/);
  });
});
