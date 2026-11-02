'use client';
import { useParams, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ErrorBox, MicButton, PageHeader, PhraseCard, ScorePill, Spinner } from '@/components/ui';
import { callApi } from '@/lib/api-client';
import { getLocalDate } from '@/lib/dates';
import type { RoleplayFeedback, RoleplayMessage, RoleplayStart, RoleplayTurn } from '@/lib/schemas';
import { getMove, getScenario } from '@/lib/social-content';
import { useSpeechRecognition } from '@/lib/speech';
import { castVoices, say, stopAudio } from '@/lib/tts';
import { addPhrases, buildLearnerContext, markActive } from '@/lib/state';
import { useAppState } from '@/lib/storage';

const MAX_TURNS = 25;

interface ChatItem extends RoleplayMessage {
  tip?: string;
}

export default function RoleplayPage() {
  // useSearchParams needs a Suspense boundary for the static build.
  return (
    <Suspense fallback={<Spinner />}>
      <Roleplay />
    </Suspense>
  );
}

function Roleplay() {
  const { id } = useParams<{ id: string }>();
  const moveId = useSearchParams().get('move');
  const scenario = getScenario(id);
  const move = moveId ? getMove(moveId) : undefined;
  const skillFocus = move ? `${move.title}: ${move.tagline}` : scenario?.skillFocus ?? '';
  const [state, update] = useAppState();
  const [setup, setSetup] = useState<RoleplayStart | null>(null);
  const [chat, setChat] = useState<ChatItem[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [voiceOn, setVoiceOn] = useState(true);
  const [feedback, setFeedback] = useState<RoleplayFeedback | null>(null);
  const requested = useRef(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const rec = useSpeechRecognition();

  const cast = useMemo(() => castVoices((setup?.characters ?? []).map((c) => ({ name: c.name, voice: c.voice }))), [setup]);
  const play = useCallback(
    (text: string, speaker: string) => say(text, { voice: cast.cloud(speaker), fallbackVoice: cast.local(speaker) }),
    [cast],
  );

  const sayAll = useCallback(
    async (msgs: RoleplayMessage[]) => {
      for (const m of msgs) await play(m.text, m.speaker);
    },
    [play],
  );

  const start = useCallback(async () => {
    if (!scenario) return;
    setBusy(true);
    setError(null);
    try {
      const s = await callApi<RoleplayStart>('/api/social/start', {
        learner: buildLearnerContext(state),
        scenarioId: scenario.id,
        scenarioBrief: scenario.brief,
        skillFocus,
      });
      setSetup(s);
      setChat(s.opening);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }, [scenario, state, skillFocus]);

  useEffect(() => {
    if (!requested.current) {
      requested.current = true;
      void start();
    }
  }, [start]);

  useEffect(() => () => stopAudio(), []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat.length, busy]);

  async function send(text: string) {
    if (!setup || !text.trim()) return;
    stopAudio();
    const mine: ChatItem = { speaker: 'You', text: text.trim() };
    const history = [...chat, mine];
    setChat(history);
    setInput('');
    setBusy(true);
    setError(null);
    try {
      const turn = await callApi<RoleplayTurn>('/api/social/turn', {
        learner: buildLearnerContext(state),
        scene: setup.scene,
        characters: setup.characters,
        skillFocus,
        history: history.slice(-60).map(({ speaker, text: t }) => ({ speaker, text: t })),
      });
      setChat((c) => [...c.slice(0, -1), { ...mine, tip: turn.coachTip || undefined }, ...turn.replies]);
      if (voiceOn) void sayAll(turn.replies);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function finish() {
    if (!setup) return;
    stopAudio();
    setBusy(true);
    setError(null);
    try {
      const fb = await callApi<RoleplayFeedback>('/api/social/feedback', {
        learner: buildLearnerContext(state),
        scene: setup.scene,
        skillFocus,
        history: chat.slice(-60).map(({ speaker, text }) => ({ speaker, text })),
      });
      const today = getLocalDate();
      update((s) =>
        markActive(
          { ...addPhrases(s, fb.phrasesToSteal, 'social', today), social: [...s.social, { date: today, scenarioId: id, feedback: fb }] },
          today,
        ),
      );
      setFeedback(fb);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!scenario) return <PageHeader title="Not found" back="/social" />;

  if (feedback) return <Debrief feedback={feedback} title={scenario.title} />;

  const myTurns = chat.filter((m) => m.speaker === 'You').length;

  return (
    <div>
      <PageHeader title={`${scenario.emoji} ${scenario.title}`} subtitle={skillFocus} back="/social" />
      {!setup && busy && <Spinner label="Setting the scene…" />}
      {error && !setup && <ErrorBox message={error} onRetry={start} />}

      {setup && (
        <>
          <div className="card mb-3 text-[15px]">
            <p>{setup.scene}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {setup.characters.map((c) => (
                <span key={c.name} className="chip text-xs">
                  <b className="mr-1">{c.name}</b> {c.vibe}
                </span>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between">
              <button className="text-sm font-medium text-brand" onClick={() => sayAll(chat.filter((m) => m.speaker !== 'You'))}>
                ▶ Play conversation
              </button>
              <label className="flex items-center gap-2 text-sm text-muted">
                <input type="checkbox" checked={voiceOn} onChange={(e) => setVoiceOn(e.target.checked)} /> Read replies aloud
              </label>
            </div>
          </div>

          <div className="space-y-2">
            {chat.map((m, i) => (
              <div key={i}>
                <div className={`flex ${m.speaker === 'You' ? 'justify-end' : ''}`}>
                  <button
                    className={`max-w-[85%] rounded-2xl px-4 py-2 text-left ${m.speaker === 'You' ? 'bg-brand text-white' : 'bg-card shadow-sm'}`}
                    onClick={() => m.speaker !== 'You' && play(m.text, m.speaker)}
                  >
                    {m.speaker !== 'You' && <p className="text-xs font-bold text-brand">{m.speaker}</p>}
                    <p className="text-[16px]">{m.text}</p>
                  </button>
                </div>
                {m.tip && <p className="ml-auto mt-1 max-w-[85%] rounded-xl bg-warn/10 px-3 py-1.5 text-right text-xs text-ink">💡 {m.tip}</p>}
              </div>
            ))}
            {busy && <Spinner />}
            <div ref={bottomRef} />
          </div>

          {myTurns === 0 && !busy && <p className="mt-3 rounded-xl bg-bg p-3 text-sm text-muted">👉 {setup.hint}</p>}
          {error && (
            <div className="mt-3">
              <ErrorBox message={error} />
            </div>
          )}

          <div className="sticky bottom-[calc(76px+env(safe-area-inset-bottom))] mt-4 bg-bg pb-2 pt-2">
            {myTurns < MAX_TURNS ? (
              <div className="flex items-end gap-2">
                <textarea
                  className="input max-h-32 min-h-[48px] flex-1 resize-none"
                  rows={1}
                  placeholder="Jump in…"
                  value={rec.listening ? [input, rec.transcript].filter(Boolean).join(' ') : input}
                  readOnly={rec.listening}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      void send(input);
                    }
                  }}
                />
                {rec.supported && (
                  <MicButton
                    listening={rec.listening}
                    disabled={busy}
                    onStart={() => {
                      stopAudio();
                      rec.start({ continuous: true });
                    }}
                    onStop={async () => {
                      const said = await rec.stop();
                      const full = [input, said].filter(Boolean).join(' ');
                      if (full.trim()) void send(full);
                    }}
                  />
                )}
                {!rec.listening && (
                  <button className="btn-primary !px-4" disabled={busy || !input.trim()} onClick={() => send(input)}>
                    Send
                  </button>
                )}
              </div>
            ) : (
              <p className="text-center text-sm text-muted">That&apos;s a great long chat. Time for feedback!</p>
            )}
            {myTurns >= 2 && (
              <button className="btn-secondary mt-2 w-full" disabled={busy} onClick={finish}>
                End &amp; get feedback
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function Debrief({ feedback, title }: { feedback: RoleplayFeedback; title: string }) {
  return (
    <div className="space-y-4">
      <PageHeader title="Debrief" subtitle={title} back="/social" />
      <div className="card grid grid-cols-2 gap-3 text-center">
        <div>
          <p className="label">Confidence</p>
          <div className="mt-1">
            <ScorePill score={feedback.confidence} max={10} />
          </div>
        </div>
        <div>
          <p className="label">Fun</p>
          <div className="mt-1">
            <ScorePill score={feedback.fun} max={10} />
          </div>
        </div>
      </div>
      <p>{feedback.summary}</p>
      <div className="card border-2 border-good/30">
        <p className="label">Your best moment</p>
        <p className="mt-1">{feedback.bestMoment}</p>
      </div>
      {feedback.missedChances.length > 0 && (
        <div>
          <p className="label mb-2">Moments you could have jumped in</p>
          <div className="space-y-2">
            {feedback.missedChances.map((m) => (
              <div key={m.moment} className="card !p-4">
                <p className="text-sm text-muted">{m.moment}</p>
                <p className="mt-1 font-semibold text-brand">→ {m.couldHaveSaid}</p>
              </div>
            ))}
          </div>
        </div>
      )}
      {feedback.rewrites.length > 0 && (
        <div>
          <p className="label mb-2">Say it more naturally</p>
          <div className="space-y-2">
            {feedback.rewrites.map((r) => (
              <div key={r.original} className="card !p-4">
                <p className="text-sm text-muted line-through">{r.original}</p>
                <p className="mt-1 font-semibold text-good">{r.moreNatural}</p>
              </div>
            ))}
          </div>
        </div>
      )}
      {feedback.phrasesToSteal.length > 0 && (
        <div>
          <p className="label mb-2">Added to your vocab</p>
          <div className="space-y-2">
            {feedback.phrasesToSteal.map((p) => (
              <PhraseCard key={p.phrase} {...p} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
