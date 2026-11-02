/**
 * Shared shape for every API route: passcode check → Zod-validate body →
 * call handler → JSON. Routes stay thin.
 */
import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import type { z } from 'zod';
import { AiError } from './claude';

export function passcodeOk(req: Request): boolean {
  const expected = process.env.APP_PASSCODE;
  if (!expected) return true;
  const given = req.headers.get('x-app-passcode') ?? '';
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function createRoute<S extends z.ZodType, R>(schema: S, handler: (body: z.infer<S>) => Promise<R>) {
  return async function POST(req: Request) {
    if (!passcodeOk(req)) {
      return NextResponse.json({ error: 'Wrong or missing passcode. Set it in Profile.' }, { status: 401 });
    }
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'Server is missing ANTHROPIC_API_KEY.' }, { status: 500 });
    }
    const json = await req.json().catch(() => null);
    const parsed = schema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
    }
    try {
      return NextResponse.json(await handler(parsed.data));
    } catch (err) {
      if (err instanceof AiError) return NextResponse.json({ error: err.message }, { status: err.status });
      return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
    }
  };
}
