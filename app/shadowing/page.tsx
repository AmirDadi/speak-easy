'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ErrorBox, MicButton, PageHeader, PhraseCard, Spinner } from '@/components/ui';
import { callApi } from '@/lib/api-client';
import { compareSpeech, type CompareResult } from '@/lib/compare';
import { LEARNING_CONFIG } from '@/lib/config';
import { getLocalDate } from '@/lib/dates';
import type { Shadowing } from '@/lib/schemas';
import { useSpeechRecognition } from '@/lib/speech';
import { castVoices, prefetch, say, stopAudio } from '@/lib/tts';
import { addPhrases, buildLearnerContext, getTodayShadowing, markActive } from '@/lib/state';
import { useAppState } from '@/lib/storage';

type Mode = 'listen' | 'shadow' | 'phrases';

export default function ShadowingPage() {
  const [state, update, hydrated] = useAppState();
  const today = getLocalDate();
  const day = getTodayShadowing(state, today);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requested = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const dialogue = await callApi<Shadowing>('/api/shadowing', {
        learner: buildLearnerContext(state),
        recentTitles: state.shadowing.slice(-14).map((d) => d.dialogue.title),
      });
      update((s) =>
        getTodayShadowing(s, today) ? s : { ...s, shadowing: [...s.shadowing, { date: today, dialogue, lineScores: {}, done: false }] },
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [state, today, update]);

  useEffect(() => {
    if (hydrated && !day && !requested.current) {
      requested.current = true;
      void load();
    }
  }, [hydrated, day, load]);

  if (!hydrated || (!day && loading)) {
    return (
      <>
        <PageHeader title="Shadowing" subtitle="Writing today's conversation for you…" />
        <Spinner label="This takes ~20 seconds" />
      </>
    );
  }
  if (!day) {
    return (
      <>
        <PageHeader title="Shadowing" />
        {error ? <ErrorBox message={error} onRetry={load} /> : <Spinner />}
      </>
    );
  }
  return <ShadowingSession key={day.date} />;
}

function ShadowingSession() {
  const [state, update] = useAppState();
  const today = getLocalDate();
  const day = getTodayShadowing(state, today)!;
  const d = day.dialogue;
  const [mode, setMode] = useState<Mode>('listen');
  const [rate, setRate] = useState<number>(LEARNING_CONFIG.TTS_RATES[1]);
  const [hideText, setHideText] = useState(false);
  const [playingIdx, setPlayingIdx] = useState<number | null>(null);
  const stopAll = useRef(false);

  // Each speaker gets a distinct natural voice (older dialogues without
  // speakerVoices just alternate female/male).
  const cast = useMemo(
    () => castVoices(d.speakers.map((name, i) => ({ name, voice: d.speakerVoices?.[i] }))),
    [d.speakers, d.speakerVoices],
  );
  const play = useCallback(
    (text: string, speaker: string) => say(text, { voice: cast.cloud(speaker), fallbackVoice: cast.local(speaker), rate }),
    [cast, rate],
  );

  // Fetch all lines' audio up front so playback is instant (and cached for replays).
  useEffect(() => {
    void prefetch(d.lines.map((l) => ({ text: l.text, voice: cast.cloud(l.speaker) })));
  }, [d.lines, cast]);

  async function playAll() {
    stopAll.current = false;
    for (let i = 0; i < d.lines.length; i++) {
      if (stopAll.current) break;
      setPlayingIdx(i);
      await play(d.lines[i].text, d.lines[i].speaker);
      await new Promise((r) => setTimeout(r, 250));
    }
    setPlayingIdx(null);
  }

  function stop() {
    stopAll.current = true;
    stopAudio();
    setPlayingIdx(null);
  }

  useEffect(() => () => stopAudio(), []);

  function finish() {
    update((s) => {
      const next = addPhrases(s, d.phrases, 'shadowing', today);
      return markActive(
        { ...next, shadowing: next.shadowing.map((x) => (x.date === today ? { ...x, done: true } : x)) },
        today,
      );
    });
  }

  const attempted = Object.keys(day.lineScores).length;

  return (
    <div>
      <PageHeader title={d.title} subtitle={d.setting} />

      <div className="mb-4 grid grid-cols-3 gap-1 rounded-2xl bg-line/60 p-1 text-sm font-semibold">
        {(['listen', 'shadow', 'phrases'] as Mode[]).map((m, i) => (
          <button
            key={m}
            onClick={() => {
              stop();
              setMode(m);
            }}
            className={`rounded-xl py-2 ${mode === m ? 'bg-card shadow-sm' : 'text-muted'}`}
          >
            {i + 1}. {m === 'listen' ? 'Listen' : m === 'shadow' ? 'Shadow' : 'Phrases'}
          </button>
        ))}
      </div>

      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex gap-1">
          {LEARNING_CONFIG.TTS_RATES.map((r) => (
            <button key={r} onClick={() => setRate(r)} className={`chip ${rate === r ? 'border-brand bg-brand text-white' : ''}`}>
              {r === 1 ? '1×' : `${r}×`}
            </button>
          ))}
        </div>
        {mode === 'listen' && (
          <label className="flex items-center gap-2 text-sm text-muted">
            <input type="checkbox" checked={hideText} onChange={(e) => setHideText(e.target.checked)} /> Hide text
          </label>
        )}
      </div>

      {mode === 'listen' && (
        <div>
          <div className="card mb-3 text-[15px]">
            <p className="label">Listen for</p>
            <p className="mt-1">{d.listeningTip}</p>
          </div>
          <div className="card space-y-3">
            {d.lines.map((line, i) => (
              <button
                key={i}
                onClick={() => {
                  stop();
                  setPlayingIdx(i);
                  void play(line.text, line.speaker).then(() => setPlayingIdx(null));
                }}
                className={`block w-full rounded-xl p-2 text-left transition ${playingIdx === i ? 'bg-brand/10' : ''}`}
              >
                <span className="text-xs font-bold text-brand">{line.speaker}</span>
                <p className={`text-[17px] leading-snug ${hideText && playingIdx !== i ? 'select-none blur-sm' : ''}`}>{line.text}</p>
              </button>
            ))}
          </div>
          <div className="sticky bottom-[calc(84px+env(safe-area-inset-bottom))] mt-4 flex gap-3">
            {playingIdx === null ? (
              <button className="btn-primary flex-1" onClick={playAll}>
                ▶ Play whole conversation
              </button>
            ) : (
              <button className="btn-secondary flex-1" onClick={stop}>
                ■ Stop
              </button>
            )}
            <button className="btn-secondary" onClick={() => setMode('shadow')}>
              Next ›
            </button>
          </div>
        </div>
      )}

      {mode === 'shadow' && (
        <ShadowLines
          dialogue={d}
          play={play}
          scores={day.lineScores}
          onScore={(i, ratio) =>
            update((s) => ({
              ...s,
              shadowing: s.shadowing.map((x) =>
                x.date === today ? { ...x, lineScores: { ...x.lineScores, [i]: Math.max(ratio, x.lineScores[i] ?? 0) } } : x,
              ),
            }))
          }
          onDone={() => setMode('phrases')}
        />
      )}

      {mode === 'phrases' && (
        <div className="space-y-3">
          <p className="text-muted">
            New phrases from today&apos;s conversation. They&apos;ll show up in your Vocab practice, where you&apos;ll use them in your own sentences.
          </p>
          {d.phrases.map((p) => (
            <PhraseCard key={p.phrase} {...p} />
          ))}
          {day.done ? (
            <div className="card text-center">
              <p className="text-2xl">🎉</p>
              <p className="font-semibold">Done for today!</p>
              <p className="text-sm text-muted">
                {attempted}/{d.lines.length} lines shadowed. Phrases added to your vocab bank.
              </p>
            </div>
          ) : (
            <button className="btn-primary w-full" onClick={finish}>
              Finish &amp; add phrases to my vocab
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function ShadowLines(props: {
  dialogue: Shadowing;
  play: (text: string, speaker: string) => Promise<void>;
  scores: Record<number, number>;
  onScore: (i: number, ratio: number) => void;
  onDone: () => void;
}) {
  const { dialogue, play, scores, onScore, onDone } = props;
  const firstUnattempted = dialogue.lines.findIndex((_, i) => scores[i] === undefined);
  const [idx, setIdx] = useState(firstUnattempted === -1 ? 0 : firstUnattempted);
  const [result, setResult] = useState<CompareResult | null>(null);
  const rec = useSpeechRecognition();
  const line = dialogue.lines[idx];
  const wasListening = useRef(false);

  // Score once recognition ends (after the user taps stop, or the browser
  // auto-stops on silence).
  useEffect(() => {
    if (wasListening.current && !rec.listening && rec.finalText) {
      const r = compareSpeech(line.text, rec.finalText);
      setResult(r);
      onScore(idx, r.ratio);
    }
    wasListening.current = rec.listening;
  }, [rec.listening, rec.finalText, line.text, idx, onScore]);

  function go(n: number) {
    stopAudio();
    rec.stop();
    setResult(null);
    rec.reset();
    setIdx(n);
  }

  const pass = result && result.ratio >= LEARNING_CONFIG.SHADOW_PASS_RATIO;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between text-sm text-muted">
        <span>
          Line {idx + 1} of {dialogue.lines.length}
        </span>
        <span>{Object.keys(scores).length} practiced</span>
      </div>
      <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-line">
        <div className="h-full bg-brand transition-all" style={{ width: `${((idx + 1) / dialogue.lines.length) * 100}%` }} />
      </div>

      <div className="card">
        <span className="text-xs font-bold text-brand">{line.speaker}</span>
        <p className="mt-1 text-[22px] font-medium leading-snug">
          {result
            ? result.words.map((w, i) => (
                <span key={i} className={w.matched ? 'text-good' : 'text-bad underline decoration-wavy'}>
                  {w.word}{' '}
                </span>
              ))
            : line.text}
        </p>
        {line.note && <p className="mt-3 rounded-xl bg-bg p-3 text-sm">💡 {line.note}</p>}

        {result && (
          <p className={`mt-3 text-sm font-semibold ${pass ? 'text-good' : 'text-warn'}`}>
            {Math.round(result.ratio * 100)}% match. {pass ? 'Nice! 🎯' : 'Listen again and match the rhythm.'}
          </p>
        )}
        {rec.listening && <p className="mt-3 text-sm italic text-muted">{rec.transcript || 'Listening…'}</p>}
        {rec.error && <p className="mt-3 text-sm text-bad">{rec.error}</p>}
      </div>

      <div className="mt-5 flex items-center justify-center gap-6">
        <button className="btn-secondary h-14 w-14 !rounded-full !p-0 text-xl" aria-label="Play line" onClick={() => play(line.text, line.speaker)}>
          ▶
        </button>
        {rec.supported ? (
          <MicButton
            size="lg"
            listening={rec.listening}
            onStart={() => {
              stopAudio();
              setResult(null);
              rec.start();
            }}
            onStop={rec.stop}
          />
        ) : (
          <p className="max-w-[180px] text-center text-xs text-muted">Speech recognition isn&apos;t supported in this browser. Try Chrome or Safari.</p>
        )}
        <button
          className="btn-secondary h-14 w-14 !rounded-full !p-0 text-xl"
          aria-label="Play then record"
          title="Play, then record"
          onClick={async () => {
            setResult(null);
            await play(line.text, line.speaker);
            rec.start();
          }}
        >
          ⟳
        </button>
      </div>
      <p className="mt-2 text-center text-xs text-muted">▶ listen · 🎙 repeat · ⟳ listen then repeat</p>

      <div className="mt-6 flex gap-3">
        <button className="btn-secondary" disabled={idx === 0} onClick={() => go(idx - 1)}>
          ‹ Prev
        </button>
        {idx < dialogue.lines.length - 1 ? (
          <button className="btn-primary flex-1" onClick={() => go(idx + 1)}>
            Next line ›
          </button>
        ) : (
          <button className="btn-primary flex-1" onClick={onDone}>
            See new phrases ›
          </button>
        )}
      </div>
    </div>
  );
}
