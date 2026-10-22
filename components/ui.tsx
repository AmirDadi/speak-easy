'use client';
import Link from 'next/link';
import type { ReactNode } from 'react';

export function PageHeader({ title, subtitle, back }: { title: string; subtitle?: string; back?: string }) {
  return (
    <header className="mb-5 pt-2">
      {back && (
        <Link href={back} className="mb-2 inline-block text-sm font-medium text-brand">
          ‹ Back
        </Link>
      )}
      <h1 className="text-[28px] font-bold leading-tight tracking-tight">{title}</h1>
      {subtitle && <p className="mt-1 text-[15px] text-muted">{subtitle}</p>}
    </header>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 py-6 text-muted" role="status">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-line border-t-brand" />
      {label && <span className="text-sm">{label}</span>}
    </div>
  );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-2xl border border-bad/30 bg-bad/10 p-4 text-sm text-bad">
      <p>{message}</p>
      {onRetry && (
        <button className="mt-2 font-semibold underline" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}

export function ScorePill({ score, max }: { score: number; max: number }) {
  const r = score / max;
  const color = r >= 0.8 ? 'bg-good/15 text-good' : r >= 0.55 ? 'bg-warn/15 text-warn' : 'bg-bad/15 text-bad';
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-sm font-bold tabular-nums ${color}`}>
      {score}/{max}
    </span>
  );
}

export function Section({ title, children, right }: { title: string; children: ReactNode; right?: ReactNode }) {
  return (
    <section className="mb-6">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="label">{title}</h2>
        {right}
      </div>
      {children}
    </section>
  );
}

export function PhraseCard({
  phrase,
  meaning,
  example,
  register,
}: {
  phrase: string;
  meaning: string;
  example?: string;
  register?: string;
}) {
  return (
    <div className="rounded-2xl border border-line p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[17px] font-semibold">{phrase}</p>
        {register && <span className="chip shrink-0 text-xs text-muted">{register}</span>}
      </div>
      <p className="mt-1 text-[15px] text-muted">{meaning}</p>
      {example && <p className="mt-2 text-[15px] italic">“{example}”</p>}
    </div>
  );
}

export function MicButton({
  listening,
  onStart,
  onStop,
  disabled,
  size = 'md',
}: {
  listening: boolean;
  onStart: () => void;
  onStop: () => void;
  disabled?: boolean;
  size?: 'md' | 'lg';
}) {
  const dims = size === 'lg' ? 'h-20 w-20 text-3xl' : 'h-14 w-14 text-2xl';
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={listening ? onStop : onStart}
      aria-label={listening ? 'Stop recording' : 'Start recording'}
      className={`${dims} relative flex shrink-0 items-center justify-center rounded-full text-white shadow-lg transition active:scale-95 disabled:opacity-40 ${
        listening ? 'bg-bad' : 'bg-brand'
      }`}
    >
      {listening && <span className="absolute inset-0 animate-ping rounded-full bg-bad/40" />}
      <span className="relative">{listening ? '■' : '🎙'}</span>
    </button>
  );
}
