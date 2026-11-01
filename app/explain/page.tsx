'use client';
import { useEffect, useRef, useState } from 'react';
import { ErrorBox, MicButton, PageHeader, PhraseCard, ScorePill, Section, Spinner } from '@/components/ui';
import { callApi } from '@/lib/api-client';
import { LEARNING_CONFIG } from '@/lib/config';
import { daysBetween, getLocalDate } from '@/lib/dates';
import { EXPLAIN_AUDIENCES } from '@/lib/explain-content';
import type { ExplainReport } from '@/lib/schemas';
import { useSpeechRecognition } from '@/lib/speech';
import {
  addPhrases,
  buildLearnerContext,
  getLastExplain,
  getNextAudience,
  getNextExplainPart,
  isExplainDue,
  markActive,
  type ExplainEntry,
  type ExplainSubject,
} from '@/lib/state';
import { useAppState } from '@/lib/storage';

const DEFAULT_NAME = 'AIR';

export default function ExplainPage() {
  const [state, , hydrated] = useAppState();
  const [editing, setEditing] = useState(false);
  const [extra, setExtra] = useState(false);
  const [viewing, setViewing] = useState<ExplainEntry | null>(null);
  if (!hydrated) return <Spinner />;

  const subject = state.explain.subject;
  if (!subject || editing) return <SubjectSetup initial={subject} onDone={() => setEditing(false)} />;

  if (viewing) {
    return (
      <div>
        <PageHeader title={viewing.part} subtitle={`${viewing.date} · to ${viewing.audience}`} />
        <button className="btn-ghost -ml-4 mb-2" onClick={() => setViewing(null)}>
          ‹ All sessions
        </button>
        <Report entry={viewing} />
      </div>
    );
  }

  const today = getLocalDate();
  if (isExplainDue(state, today) || extra) return <Session subject={subject} onCancel={extra ? () => setExtra(false) : undefined} />;

  const last = getLastExplain(state);
  const daysLeft = last ? LEARNING_CONFIG.EXPLAIN_INTERVAL_DAYS - daysBetween(last.date, today) : 0;
  return (
    <div>
      <PageHeader title={`Explain ${subject.name}`} subtitle={`Next session ${daysLeft <= 1 ? 'tomorrow' : `in ${daysLeft} days`}`} />
      {last && (
        <div className="card mb-4">
          <p className="label">Focus for next time</p>
          <p className="mt-1 text-[17px] font-medium">{last.report.nextTimeFocus}</p>
        </div>
      )}
      <div className="mb-6 flex gap-3">
        <button className="btn-secondary flex-1" onClick={() => setExtra(true)}>
          Extra session now
        </button>
        <button className="btn-secondary" onClick={() => setEditing(true)}>
          Edit {subject.name}
        </button>
      </div>
      <History entries={state.explain.entries} onOpen={setViewing} />
    </div>
  );
}

function SubjectSetup({ initial, onDone }: { initial: ExplainSubject | null; onDone: () => void }) {
  const [, update] = useAppState();
  const [name, setName] = useState(initial?.name ?? DEFAULT_NAME);
  const [description, setDescription] = useState(initial?.description ?? '');
  const [parts, setParts] = useState((initial?.parts ?? []).join('\n'));
  const partList = parts
    .split('\n')
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <div>
      <PageHeader
        title={initial ? `Edit ${initial.name}` : `Explain ${name || DEFAULT_NAME}`}
        subtitle="Every other day you'll explain one part out loud for ~5 minutes and get feedback on your words and structure."
      />
      <div className="card space-y-4">
        <label className="block">
          <span className="label">What are you explaining?</span>
          <input className="input mt-1" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="block">
          <span className="label">What is it? (1–3 sentences, any language)</span>
          <textarea
            className="input mt-1 min-h-[90px]"
            placeholder="Helps your coach understand what you're talking about. It won't grade your facts."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
        <label className="block">
          <span className="label">Parts to explain (one per line)</span>
          <textarea
            className="input mt-1 min-h-[140px]"
            placeholder={'What it is & who it\'s for\nHow it works\nThe main features\nWhat makes it different\nA real example / use case'}
            value={parts}
            onChange={(e) => setParts(e.target.value)}
          />
        </label>
        <div className="flex gap-3">
          {initial && (
            <button className="btn-secondary" onClick={onDone}>
              Cancel
            </button>
          )}
          <button
            className="btn-primary flex-1"
            disabled={!name.trim() || partList.length === 0}
            onClick={() => {
              update((s) => ({ ...s, explain: { ...s.explain, subject: { name: name.trim(), description: description.trim(), parts: partList } } }));
              onDone();
            }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

type Phase = 'intro' | 'prep' | 'record' | 'review' | 'assessing';

function Session({ subject, onCancel }: { subject: ExplainSubject; onCancel?: () => void }) {
  const [state, update] = useAppState();
  const today = getLocalDate();
  const [part, setPart] = useState(() => getNextExplainPart(state) ?? subject.parts[0]);
  const [audience] = useState(() => getNextAudience(state, EXPLAIN_AUDIENCES));
  const [phase, setPhase] = useState<Phase>('intro');
  const [prepLeft, setPrepLeft] = useState<number>(LEARNING_CONFIG.EXPLAIN_PREP_SEC);
  const [elapsed, setElapsed] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [entry, setEntry] = useState<ExplainEntry | null>(null);
  const startedAt = useRef(0);
  const rec = useSpeechRecognition();
  const target = LEARNING_CONFIG.EXPLAIN_TARGET_SEC;
  const last = getLastExplain(state);

  useEffect(() => {
    if (phase !== 'prep') return;
    if (prepLeft <= 0) {
      setPhase('record');
      return;
    }
    const t = setTimeout(() => setPrepLeft((p) => p - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, prepLeft]);

  useEffect(() => {
    if (phase !== 'record' || !rec.listening) return;
    const t = setInterval(() => setElapsed(Math.round((Date.now() - startedAt.current) / 1000)), 500);
    return () => clearInterval(t);
  }, [phase, rec.listening]);

  async function stopRecording() {
    setElapsed(Math.round((Date.now() - startedAt.current) / 1000));
    setTranscript(await rec.stop());
    setPhase('review');
  }

  async function assess() {
    setPhase('assessing');
    setError(null);
    try {
      const report = await callApi<ExplainReport>('/api/explain/assess', {
        learner: buildLearnerContext(state),
        subjectName: subject.name,
        subjectDescription: subject.description,
        part,
        audience,
        transcript,
        durationSec: Math.max(1, elapsed),
        previousFocus: last?.report.nextTimeFocus ?? '',
      });
      const e: ExplainEntry = { date: today, part, audience, transcript, durationSec: elapsed, report };
      update((s) =>
        markActive(
          { ...addPhrases(s, report.structurePhrases, 'speaking', today), explain: { ...s.explain, entries: [...s.explain.entries, e] } },
          today,
        ),
      );
      setEntry(e);
    } catch (err) {
      setError((err as Error).message);
      setPhase('review');
    }
  }

  if (entry) {
    return (
      <div>
        <PageHeader title="Your feedback" subtitle={`${entry.part} · to ${entry.audience}`} />
        <Report entry={entry} />
      </div>
    );
  }

  const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div>
      <PageHeader title={`Explain ${subject.name}`} subtitle="~5 minutes, out loud. Words and structure are what count." />
      <div className="card mb-4">
        <p className="label">Today&apos;s part</p>
        <p className="mt-1 text-[22px] font-bold leading-tight">{part}</p>
        <p className="label mt-4">You&apos;re explaining it to</p>
        <p className="mt-1 text-[17px]">{audience}</p>
        {last && (
          <>
            <p className="label mt-4">Remember from last time</p>
            <p className="mt-1 text-[15px]">{last.report.nextTimeFocus}</p>
          </>
        )}
        {phase === 'intro' && subject.parts.length > 1 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {subject.parts.map((p) => (
              <button key={p} onClick={() => setPart(p)} className={`chip text-sm ${p === part ? 'border-brand bg-brand text-white' : ''}`}>
                {p}
              </button>
            ))}
          </div>
        )}
      </div>

      {!rec.supported && <ErrorBox message="Speech recognition isn't supported in this browser. Please use Chrome or Safari." />}

      {phase === 'intro' && (
        <>
          <div className="card mb-4 text-[15px]">
            <p className="label">A simple structure to try</p>
            <ol className="mt-2 list-decimal space-y-1 pl-5">
              <li>What it is, in one sentence</li>
              <li>Why it matters to this person</li>
              <li>How it works, in 2–3 steps (&quot;First… then… so…&quot;)</li>
              <li>A real example or an analogy (&quot;Think of it like…&quot;)</li>
              <li>Wrap up (&quot;So basically…&quot;)</li>
            </ol>
          </div>
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
              {LEARNING_CONFIG.EXPLAIN_PREP_SEC}s to think
            </button>
          </div>
        </>
      )}

      {phase === 'prep' && (
        <div className="card text-center">
          <p className="text-5xl font-bold tabular-nums">{prepLeft}</p>
          <p className="text-muted">Plan your opening sentence and one example.</p>
          <button className="btn-primary mt-4 w-full" onClick={() => setPhase('record')}>
            I&apos;m ready
          </button>
        </div>
      )}

      {phase === 'record' && (
        <div className="card text-center">
          <p className="text-5xl font-bold tabular-nums">
            {mmss(elapsed)}
            <span className="text-xl text-muted"> / {mmss(target)}</span>
          </p>
          <div className="mx-auto mt-3 h-1.5 max-w-[240px] overflow-hidden rounded-full bg-line">
            <div className={`h-full ${elapsed >= target ? 'bg-good' : 'bg-brand'}`} style={{ width: `${Math.min(100, (elapsed / target) * 100)}%` }} />
          </div>
          <p className="mt-2 text-sm text-muted">
            {rec.listening ? (elapsed < target - 60 ? 'Keep explaining…' : elapsed < target ? 'Start wrapping up.' : 'Time! Finish your sentence and stop.') : 'Tap the mic and start explaining'}
          </p>
          <div className="mt-5 flex justify-center">
            <MicButton
              size="lg"
              listening={rec.listening}
              disabled={!rec.supported}
              onStart={() => {
                startedAt.current = Date.now();
                setElapsed(0);
                rec.start({ continuous: true });
              }}
              onStop={stopRecording}
            />
          </div>
          {rec.listening && <p className="mt-4 max-h-32 overflow-y-auto text-left text-sm text-muted">{rec.transcript}</p>}
          {rec.error && <p className="mt-3 text-sm text-bad">{rec.error}</p>}
        </div>
      )}

      {phase === 'review' && (
        <div className="space-y-3">
          <div className="card">
            <p className="label">What we heard ({mmss(elapsed)})</p>
            <textarea className="input mt-2 min-h-[180px] text-[15px]" value={transcript} onChange={(e) => setTranscript(e.target.value)} />
            <p className="mt-2 text-xs text-muted">Only fix words the mic clearly got wrong (like names of features). Leave your own wording as it was.</p>
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
            <button className="btn-primary flex-1" disabled={transcript.trim().split(/\s+/).length < 30} onClick={assess}>
              Get feedback
            </button>
          </div>
        </div>
      )}

      {phase === 'assessing' && <Spinner label="Reading your explanation… (~30s)" />}
    </div>
  );
}

function Report({ entry }: { entry: ExplainEntry }) {
  const r = entry.report;
  const rows: [string, { score: number; comment: string }][] = [
    ['Structure', r.structure],
    ['Clarity for this audience', r.clarity],
    ['Vocabulary', r.vocabulary],
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

      <Section title="Your structure → a stronger one">
        <div className="grid gap-3">
          <div className="card">
            <p className="label">How you organized it</p>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-[15px] text-muted">
              {r.howYouStructuredIt.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ol>
          </div>
          <div className="card border-2 border-good/30">
            <p className="label">Try this order next time</p>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-[15px]">
              {r.betterStructure.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ol>
          </div>
        </div>
      </Section>

      <Section title="Word upgrades">
        <div className="space-y-2">
          {r.wordUpgrades.map((f) => (
            <div key={f.youSaid} className="card !p-4">
              <p className="text-sm text-bad line-through decoration-bad/40">{f.youSaid}</p>
              <p className="mt-1 font-semibold text-good">{f.better}</p>
              <p className="mt-1 text-sm text-muted">{f.why}</p>
            </div>
          ))}
        </div>
      </Section>

      <div className="card border-2 border-brand/40">
        <p className="label">Focus for next time</p>
        <p className="mt-1 text-[17px] font-medium">{r.nextTimeFocus}</p>
      </div>

      {r.structurePhrases.length > 0 && (
        <Section title="Explaining phrases (added to your vocab)">
          <div className="space-y-2">
            {r.structurePhrases.map((p) => (
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

function History({ entries, onOpen }: { entries: ExplainEntry[]; onOpen: (e: ExplainEntry) => void }) {
  if (!entries.length) return null;
  return (
    <Section title="Past sessions">
      <div className="space-y-2">
        {[...entries].reverse().map((e, i) => (
          <button key={i} className="card flex w-full items-center justify-between !p-4 text-left" onClick={() => onOpen(e)}>
            <span>
              <span className="block font-semibold">{e.part}</span>
              <span className="text-sm text-muted">
                {e.date} · to {e.audience}
              </span>
            </span>
            <ScorePill score={e.report.overall} max={10} />
          </button>
        ))}
      </div>
    </Section>
  );
}
