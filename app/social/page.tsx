'use client';
import Link from 'next/link';
import { PageHeader, ScorePill, Section, Spinner } from '@/components/ui';
import { MOVES, SCENARIOS, getScenario } from '@/lib/social-content';
import { useAppState } from '@/lib/storage';

export default function SocialPage() {
  const [state, , hydrated] = useAppState();
  if (!hydrated) return <Spinner />;
  const done = new Set(state.completedLessons);

  return (
    <div>
      <PageHeader title="Social & fun" subtitle="How to jump in, keep it going, and make people laugh, in English." />

      <Section title={`Conversation moves · ${done.size}/${MOVES.length}`}>
        <div className="space-y-2">
          {MOVES.map((m, i) => (
            <Link key={m.id} href={`/social/${m.id}`} className="card flex items-center gap-4 !p-4">
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                  done.has(m.id) ? 'bg-good text-white' : 'bg-bg text-muted'
                }`}
              >
                {done.has(m.id) ? '✓' : i + 1}
              </span>
              <span className="min-w-0">
                <span className="block font-semibold">{m.title}</span>
                <span className="block truncate text-sm text-muted">{m.tagline}</span>
              </span>
            </Link>
          ))}
        </div>
      </Section>

      <Section title="Role-play practice">
        <div className="grid grid-cols-2 gap-3">
          {SCENARIOS.map((s) => (
            <Link key={s.id} href={`/social/roleplay/${s.id}`} className="card !p-4">
              <span className="text-3xl">{s.emoji}</span>
              <span className="mt-2 block font-semibold leading-tight">{s.title}</span>
              <span className="mt-1 block text-xs text-muted">{s.skillFocus}</span>
            </Link>
          ))}
        </div>
      </Section>

      {state.social.length > 0 && (
        <Section title="Past role-plays">
          <div className="space-y-2">
            {[...state.social].reverse().slice(0, 10).map((e, i) => (
              <details key={i} className="card !p-4">
                <summary className="flex cursor-pointer list-none items-center justify-between">
                  <span>
                    <span className="block font-semibold">{getScenario(e.scenarioId)?.title ?? e.scenarioId}</span>
                    <span className="text-sm text-muted">{e.date}</span>
                  </span>
                  <span className="flex gap-1">
                    <ScorePill score={e.feedback.confidence} max={10} />
                    <ScorePill score={e.feedback.fun} max={10} />
                  </span>
                </summary>
                <p className="mt-3 text-sm">{e.feedback.summary}</p>
              </details>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}
