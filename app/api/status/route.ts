import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/** Lets the client know whether to ask for a passcode before any AI call. */
export function GET() {
  return NextResponse.json({ passcodeRequired: Boolean(process.env.APP_PASSCODE) });
}
