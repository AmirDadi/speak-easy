'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ErrorBox, MicButton, PageHeader, PhraseCard, ScorePill, Section, Spinner } from '@/components/ui';
import { callApi } from '@/lib/api-client';
import { LEARNING_CONFIG } from '@/lib/config';
import { daysBetween, getLocalDate } from '@/lib/dates';
import type { SpeakingReport, SpeakingTopic } from '@/lib/schemas';
import { useSpeechRecognition } from '@/lib/speech';
import { addPhrases, buildLearnerContext, getLastSpeaking, isSpeakingDue, markActive, mergeWeakAreas, type SpeakingEntry } from '@/lib/state';
import { useAppState } from '@/lib/storage';

type Phase = 'intro' | 'prep' | 'record' | 'review' | 'assessing';

export default function SpeakingPage() {
  const [state, , hydrated] = useAppState();
  const [practice, setPractice] = useState(false);
  const [viewing, setViewing] = useState<SpeakingEntry | null>(null);
  if (!hydrated) return <Spinner />;

  const today = getLocalDate();
  const due = isSpeakingDue(state, today);
  const last = getLastSpeaking(state);

  if (viewing) {
    return (
      <div>
        <PageHeader title={viewing.topic.topic} subtitle={new Date(viewing.date).toLocaleDateString('en-US', { dateStyle: 'medium' })} />
        <button className="btn-ghost -ml-4 mb-2" onClick={() => setViewing(null)}>
          ‹ All sessions
        </button>
        <Report entry={viewing} />
      </div>
    );
  }

  if (due || practice) return <Session onCancel={practice ? () => setPractice(false) : undefined} />;

  const daysLeft = last ? LEARNING_CONFIG.SPEAKING_INTERVAL_DAYS - daysBetween(last.date, today) : 0;
  return (
    <div>
      <PageHeader title="Weekly speaking" subtitle={`Next session in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`} />
      {last && (
        <div className="card mb-4">
          <p className="label">Your focus this week</p>
          <p className="mt-1 text-[17px] font-medium">{last.report.nextWeekFocus}</p>
        </div>
      )}
      <button className="btn-secondary mb-6 w-full" onClick={() => setPractice(true)}>
        Do an extra session now
      </button>
      <History entries={state.speaking.entries} onOpen={setViewing} />
    </div>
  );
}

function History({ entries, onOpen }: { entries: SpeakingEntry[]; onOpen: (e: SpeakingEntry) => void }) {
  if (!entries.length) return null;
  const max = 10;
  return (
    <Section title="Progress">
      <div className="card mb-3">
        <div className="flex h-24 items-end gap-1.5">
          {entries.slice(-12).map((e) => (
            <div key={e.date + e.topic.topic} className="flex flex-1 flex-col items-center gap-1">
              <div className="w-full rounded-t-md bg-brand" style={{ height: `${(e.report.overall / max) * 80}px` }} title={`${e.report.overall}/10`} />
              <span className="text-[10px] text-muted">{e.date.slice(5)}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        {[...entries].reverse().map((e) => (
          <button key={e.date + e.topic.topic} className="card flex w-full items-center justify-between !p-4 text-left" onClick={() => onOpen(e)}>
            <span>
              <span className="block font-semibold">{e.topic.topic}</span>
              <span className="text-sm text-muted">{e.date}</span>
            </span>
            <ScorePill score={e.report.overall} max={10} />
          </button>
        ))}
      </div>
    </Section>
  );
}

function Session({ onCancel }: { onCancel?: () => void }) {
  const [state, update] = useAppState();
  const today = getLocalDate();
  const pending = state.speaking.pendingTopic;
  const [topic, setTopic] = useState<SpeakingTopic | null>(pending?.topic ?? null);
  const [phase, setPhase] = useState<Phase>('intro');
  const [error, setError] = useState<string | null>(null);
  const [loadingTopic, setLoadingTopic] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [prepLeft, setPrepLeft] = useState<number>(LEARNING_CONFIG.SPEAKING_PREP_SEC);
  const [transcript, setTranscript] = useState('');
  const [entry, setEntry] = useState<SpeakingEntry | null>(null);
  const startedAt = useRef(0);
  const requested = useRef(false);
  const rec = useSpeechRecognition();

  const fetchTopic = useCallback(async () => {
    setLoadingTopic(true);
    setError(null);
    try {
      const t = await callApi<SpeakingTopic>('/api/speaking/topic', {
        learner: buildLearnerContext(state),
        recentTopics: state.speaking.entries.slice(-12).map((e) => e.topic.topic),
      });
      setTopic(t);
      update((s) => ({ ...s, speaking: { ...s.speaking, pendingTopic: { date: today, topic: t } } }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoadingTopic(false);
    }
  }, [state, today, update]);

  useEffect(() => {
    if (!topic && !requested.current) {
      requested.current = true;
      void fetchTopic();
    }
  }, [topic, fetchTopic]);

  // Prep countdown
  useEffect(() => {
    if (phase !== 'prep') return;
    if (prepLeft <= 0) {
      setPhase('record');
      return;
    }
    const t = setTimeout(() => setPrepLeft((p) => p - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, prepLeft]);

  // Recording timer
  useEffect(() => {
    if (phase !== 'record' || !rec.listening) return;
    const t = setInterval(() => setElapsed(Math.round((Date.now() - startedAt.current) / 1000)), 500);
    return () => clearInterval(t);
  }, [phase, rec.listening]);

  function startRecording() {
    startedAt.current = Date.now();
    setElapsed(0);
    rec.start({ continuous: true });
  }

  async function stopRecording() {
    setElapsed(Math.round((Date.now() - startedAt.current) / 1000));
    setTranscript(await rec.stop());
    setPhase('review');
  }

  async function assess() {
    if (!topic) return;
    setPhase('assessing');
    setError(null);
    const last = getLastSpeaking(state);
    try {
      const report = await callApi<SpeakingReport>('/api/speaking/assess', {
        learner: buildLearnerContext(state),
        topic: topic.topic,
        prompt: topic.prompt,
        transcript,
        durationSec: Math.max(1, elapsed),
        previousFocus: last?.report.nextWeekFocus ?? '',
      });
      const e: SpeakingEntry = { date: today, topic, transcript, durationSec: elapsed, report };
      update((s) => {
        const withPhrases = addPhrases(s, report.newPhrasesToLearn, 'speaking', today);
        return markActive(
          {
            ...withPhrases,
            profile: { ...withPhrases.profile, weakAreas: mergeWeakAreas(withPhrases.profile.weakAreas, report.weakAreas) },
            speaking: { pendingTopic: null, entries: [...withPhrases.speaking.entries, e] },
          },
          today,
        );
      });
      setEntry(e);
    } catch (err) {
      setError((err as Error).message);
      setPhase('review');
    }
  }

  if (entry) {
    return (
      <div>
        <PageHeader title="Your report" subtitle={entry.topic.topic} />
        <Report entry={entry} />
      </div>
    );
  }

  if (!topic) {
    return (
      <div>
        <PageHeader title="Weekly speaking" />
        {loadingTopic ? <Spinner label="Picking this week's topic…" /> : error && <ErrorBox message={error} onRetry={fetchTopic} />}
      </div>
    );
  }

  const target = LEARNING_CONFIG.SPEAKING_TARGET_SEC;
  const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div>
      <PageHeader title="Weekly speaking" subtitle="Talk for 2–3 minutes. No pressure. Just keep going." />
      <div className="card mb-4">
        <p className="label">This week&apos;s topic</p>
        <p className="mt-1 text-[22px] font-bold leading-tight">{topic.topic}</p>
        <p className="mt-2">{topic.prompt}</p>
        {phase !== 'record' && (
          <>
            <p className="label mt-4">Ideas to cover</p>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-[15px]">
              {topic.guidingQuestions.map((q) => (
                <li key={q}>{q}</li>
              ))}
            </ul>
          </>
        )}
        <p className="label mt-4">Try to use</p>
        <div className="mt-1 flex flex-wrap gap-2">
          {topic.usefulPhrases.map((p) => (
            <span key={p} className="chip bg-bg">
              {p}
            </span>
          ))}
        </div>
      </div>

      {!rec.supported && <ErrorBox message="Speech recognition isn't supported in this browser. Please use Chrome or Safari." />}

      {phase === 'intro' && (
        <div className="flex gap-3">
          {onCancel && (
            <button className="btn-secondary" onClick={onCancel}>
              Cancel
            </button>
          )}
          <button className="btn-secondary" onClick={() => setPhase('record')}>
            Skip prep
          </button>
          <button className="btn-primary flex-1" onClick={() => setPhase('prep')}>
            Start {LEARNING_CONFIG.SPEAKING_PREP_SEC}s prep
          </button>
        </div>
      )}

      {phase === 'prep' && (
        <div className="card text-center">
          <p className="text-5xl font-bold tabular-nums">{prepLeft}</p>
          <p className="text-muted">Think of a story or opinion. No writing needed.</p>
          <button className="btn-primary mt-4 w-full" onClick={() => setPhase('record')}>
            I&apos;m ready
          </button>
        </div>
      )}

      {phase === 'record' && (
        <div className="card text-center">
          <p className="text-5xl font-bold tabular-nums">{mmss(elapsed)}</p>
          <div className="mx-auto mt-3 h-1.5 max-w-[240px] overflow-hidden rounded-full bg-line">
            <div className={`h-full ${elapsed >= target ? 'bg-good' : 'bg-brand'}`} style={{ width: `${Math.min(100, (elapsed / target) * 100)}%` }} />
          </div>
          <p className="mt-2 text-sm text-muted">
            {rec.listening ? (elapsed < 90 ? 'Keep going…' : elapsed < target ? 'Almost there!' : 'Great. Wrap up whenever you like.') : 'Tap the mic and start talking'}
          </p>
          <div className="mt-5 flex justify-center">
            <MicButton size="lg" listening={rec.listening} onStart={startRecording} onStop={stopRecording} disabled={!rec.supported} />
          </div>
          {rec.listening && <p className="mt-4 max-h-32 overflow-y-auto text-left text-sm text-muted">{rec.transcript}</p>}
          {rec.error && <p className="mt-3 text-sm text-bad">{rec.error}</p>}
        </div>
      )}

      {phase === 'review' && (
        <div className="space-y-3">
          <div className="card">
            <p className="label">What we heard ({mmss(elapsed)})</p>
            <textarea className="input mt-2 min-h-[160px] text-[15px]" value={transcript} onChange={(e) => setTranscript(e.target.value)} />
            <p className="mt-2 text-xs text-muted">Only fix words the mic clearly got wrong. Don&apos;t correct your own grammar; that&apos;s what we&apos;re assessing.</p>
          </div>
          {error && <ErrorBox message={error} />}
          <div className="flex gap-3">
            <button
              className="btn-secondary"
              onClick={() => {
                rec.reset();
                setTranscript('');
                setPhase('record');
              }}
            >
              Redo
            </button>
            <button className="btn-primary flex-1" disabled={transcript.trim().split(/\s+/).length < 15} onClick={assess}>
              Get my assessment
            </button>
          </div>
        </div>
      )}

      {phase === 'assessing' && <Spinner label="Your coach is listening back… (~30s)" />}
    </div>
  );
}

function Report({ entry }: { entry: SpeakingEntry }) {
  const r = entry.report;
  const rows: [string, { score: number; comment: string }][] = [
    ['Fluency', r.fluency],
    ['Vocabulary', r.vocabulary],
    ['Grammar', r.grammar],
    ['Sounding natural', r.naturalness],
    ['Engaging / fun', r.engagement],
  ];
  return (
    <div className="space-y-4">
      <div className="card flex items-center gap-4">
        <div className="flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-3xl bg-brand text-white">
          <span className="text-3xl font-bold">{r.overall}</span>
          <span className="text-xs opacity-80">/ 10</span>
        </div>
        <p className="text-[15px]">{r.summary}</p>
      </div>

      <div className="card space-y-4">
        {rows.map(([label, s]) => (
          <div key={label}>
            <div className="flex items-center justify-between">
              <p className="font-semibold">{label}</p>
              <ScorePill score={s.score} max={10} />
            </div>
            <p className="mt-1 text-sm text-muted">{s.comment}</p>
          </div>
        ))}
      </div>

      <Section title="What you did well">
        <ul className="card list-disc space-y-1 pl-9">
          {r.strengths.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </Section>

      <Section title="Top fixes">
        <div className="space-y-2">
          {r.topFixes.map((f) => (
            <div key={f.youSaid} className="card !p-4">
              <p className="text-sm text-bad line-through decoration-bad/40">{f.youSaid}</p>
              <p className="mt-1 font-semibold text-good">{f.tryInstead}</p>
              <p className="mt-1 text-sm text-muted">{f.why}</p>
            </div>
          ))}
        </div>
      </Section>

      <div className="card border-2 border-brand/40">
        <p className="label">Focus for next week</p>
        <p className="mt-1 text-[17px] font-medium">{r.nextWeekFocus}</p>
      </div>

      {r.newPhrasesToLearn.length > 0 && (
        <Section title="Added to your vocab">
          <div className="space-y-2">
            {r.newPhrasesToLearn.map((p) => (
              <PhraseCard key={p.phrase} {...p} />
            ))}
          </div>
        </Section>
      )}

      <details className="card">
        <summary className="cursor-pointer font-semibold">Transcript</summary>
        <p className="mt-2 whitespace-pre-wrap text-sm text-muted">{entry.transcript}</p>
      </details>
    </div>
  );
}
