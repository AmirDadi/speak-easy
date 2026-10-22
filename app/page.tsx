'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Spinner } from '@/components/ui';
import { LEARNING_CONFIG } from '@/lib/config';
import { computeStreak, daysBetween, getLocalDate } from '@/lib/dates';
import { MOVES } from '@/lib/social-content';
import { getDueCards, getLastSpeaking, getTodayShadowing, isSpeakingDue } from '@/lib/state';
import { isMastered } from '@/lib/srs';
import { useAppState } from '@/lib/storage';

export default function TodayPage() {
  const router = useRouter();
  const [state, , hydrated] = useAppState();

  useEffect(() => {
    if (hydrated && !state.profile.onboarded) router.replace('/onboarding');
  }, [hydrated, state.profile.onboarded, router]);

  if (!hydrated || !state.profile.onboarded) return <Spinner />;

  const today = getLocalDate();
  const shadow = getTodayShadowing(state, today);
  const due = getDueCards(state, today).length;
  const speakingDue = isSpeakingDue(state, today);
  const lastSpeaking = getLastSpeaking(state);
  const daysLeft = lastSpeaking
    ? LEARNING_CONFIG.SPEAKING_INTERVAL_DAYS - daysBetween(lastSpeaking.date, today)
    : 0;
  const nextMove = MOVES.find((m) => !state.completedLessons.includes(m.id)) ?? MOVES[0];
  const streak = computeStreak(state.activity, today);
  const cards = Object.values(state.vocab);
  const mastered = cards.filter((c) => isMastered(c.srs)).length;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Hey there' : 'Good evening';

  return (
    <div>
      <header className="mb-5 flex items-start justify-between pt-2">
        <div>
          <p className="text-[15px] text-muted">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
          <h1 className="text-[30px] font-bold tracking-tight">{greeting} 👋</h1>
        </div>
        <Link href="/profile" className="mt-2 rounded-full border border-line bg-card px-3 py-1.5 text-sm font-medium">
          Profile
        </Link>
      </header>

      <div className="mb-6 grid grid-cols-3 gap-3">
        <Stat value={`${streak}🔥`} label="day streak" />
        <Stat value={String(cards.length)} label="phrases" />
        <Stat value={String(mastered)} label="mastered" />
      </div>

      <h2 className="label mb-2">Today&apos;s plan</h2>
      <div className="space-y-3">
        <TaskCard
          href="/shadowing"
          icon="🎧"
          title="Daily shadowing"
          detail={shadow?.done ? `Done: “${shadow.dialogue.title}”` : shadow ? 'In progress, keep going' : 'A new conversation is ready'}
          done={!!shadow?.done}
        />
        <TaskCard
          href="/vocab"
          icon="✍️"
          title="Vocab in sentences"
          detail={due > 0 ? `${due} phrase${due === 1 ? '' : 's'} due for review` : cards.length ? 'All caught up 🎉' : 'Shadow first to collect phrases'}
          done={due === 0 && cards.length > 0}
        />
        <TaskCard
          href="/speaking"
          icon="🎙"
          title="Weekly speaking"
          detail={speakingDue ? 'Due now: 3 minutes, then a full report' : `Next session in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`}
          done={!speakingDue}
          highlight={speakingDue}
        />
        <TaskCard
          href={`/social/${nextMove.id}`}
          icon="🎉"
          title="Social move of the day"
          detail={nextMove.title}
          done={false}
        />
      </div>

      {lastSpeaking && (
        <div className="card mt-6">
          <p className="label">This week&apos;s focus</p>
          <p className="mt-1 text-[16px]">{lastSpeaking.report.nextWeekFocus}</p>
        </div>
      )}
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="card !p-3 text-center">
      <p className="text-xl font-bold tabular-nums">{value}</p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  );
}

function TaskCard(props: { href: string; icon: string; title: string; detail: string; done: boolean; highlight?: boolean }) {
  return (
    <Link href={props.href} className={`card flex items-center gap-4 ${props.highlight ? 'ring-2 ring-brand' : ''}`}>
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-bg text-2xl">{props.icon}</span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{props.title}</p>
        <p className="truncate text-sm text-muted">{props.detail}</p>
      </div>
      <span className={`text-xl ${props.done ? 'text-good' : 'text-muted'}`}>{props.done ? '✓' : '›'}</span>
    </Link>
  );
}
