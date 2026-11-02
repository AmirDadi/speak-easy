import { NextResponse } from 'next/server';
import { passcodeOk } from '@/lib/route';

/** Verifies the passcode without spending any AI credits. */
export function POST(req: Request) {
  return passcodeOk(req)
    ? NextResponse.json({ ok: true })
    : NextResponse.json({ error: 'Wrong passcode.' }, { status: 401 });
}
