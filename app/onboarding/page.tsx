'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ErrorBox, MicButton, PhraseCard, Spinner } from '@/components/ui';
import { callApi } from '@/lib/api-client';
import { getLocalDate } from '@/lib/dates';
import { CHECKLIST_PHRASES, PLACEMENT_QUESTIONS } from '@/lib/onboarding-content';
import type { Placement } from '@/lib/schemas';
import { useSpeechRecognition } from '@/lib/speech';
import { addPhrases, markActive } from '@/lib/state';
import { useAppState } from '@/lib/storage';

type Step = 'about' | 'checklist' | 'writing' | 'result';

export default function OnboardingPage() {
  const router = useRouter();
  const [, update] = useAppState();
  const [step, setStep] = useState<Step>('about');
  const [interests, setInterests] = useState('');
  const [goals, setGoals] = useState('');
  const [about, setAbout] = useState('');
  const [known, setKnown] = useState<Set<string>>(new Set());
  const [answers, setAnswers] = useState<string[]>(PLACEMENT_QUESTIONS.map(() => ''));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Placement | null>(null);

  async function submit() {
    setLoading(true);
    setError(null);
    try {
      const placement = await callApi<Placement>('/api/onboarding', {
        selfDescription: [about, interests && `Interests: ${interests}`, goals && `Goals: ${goals}`].filter(Boolean).join('\n'),
        knownFromChecklist: CHECKLIST_PHRASES.filter((p) => known.has(p)),
        unknownFromChecklist: CHECKLIST_PHRASES.filter((p) => !known.has(p)),
        answers: PLACEMENT_QUESTIONS.map((q, i) => ({ question: q, answer: answers[i] || '(skipped)' })),
      });
      setResult(placement);
      setStep('result');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function finish() {
    if (!result) return;
    const today = getLocalDate();
    update((s) =>
      markActive(
        addPhrases(
          {
            ...s,
            profile: { ...s.profile, onboarded: true, level: result.level, interests, goals, notes: about, weakAreas: result.weakAreas },
            knownPhrases: CHECKLIST_PHRASES.filter((p) => known.has(p)),
          },
          result.starterPhrases,
          'onboarding',
          today,
        ),
        today,
      ),
    );
    router.replace('/');
  }

  return (
    <div className="pt-4">
      <p className="label">Step {['about', 'checklist', 'writing', 'result'].indexOf(step) + 1} of 4</p>

      {step === 'about' && (
        <div className="mt-2 space-y-4">
          <h1 className="text-[28px] font-bold tracking-tight">Hey! Let&apos;s get to know you 👋</h1>
          <p className="text-muted">
            This takes about 5 minutes. Everything stays on your phone. It&apos;s only used to tailor your lessons.
          </p>
          <label className="block">
            <span className="label">What are you into?</span>
            <input className="input mt-1" placeholder="e.g. tech, soccer, cooking, travel, movies" value={interests} onChange={(e) => setInterests(e.target.value)} />
          </label>
          <label className="block">
            <span className="label">Where do you want to use English?</span>
            <input className="input mt-1" placeholder="e.g. at work with American coworkers, making friends" value={goals} onChange={(e) => setGoals(e.target.value)} />
          </label>
          <label className="block">
            <span className="label">Anything else? (optional)</span>
            <textarea
              className="input mt-1 min-h-[96px]"
              placeholder="e.g. I'm shy in groups, I understand movies but freeze when I talk…"
              value={about}
              onChange={(e) => setAbout(e.target.value)}
            />
          </label>
          <button className="btn-primary w-full" onClick={() => setStep('checklist')}>
            Next
          </button>
        </div>
      )}

      {step === 'checklist' && (
        <div className="mt-2">
          <h1 className="text-[26px] font-bold tracking-tight">Which of these do you already use?</h1>
          <p className="mt-1 text-muted">Tap the ones you&apos;d confidently use in a conversation. Be honest; we won&apos;t teach you what you already know.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {CHECKLIST_PHRASES.map((p) => {
              const on = known.has(p);
              return (
                <button
                  key={p}
                  onClick={() =>
                    setKnown((k) => {
                      const n = new Set(k);
                      if (on) n.delete(p);
                      else n.add(p);
                      return n;
                    })
                  }
                  className={`rounded-full border px-3.5 py-2 text-[15px] transition ${on ? 'border-brand bg-brand text-white' : 'border-line bg-card'}`}
                >
                  {p}
                </button>
              );
            })}
          </div>
          <div className="mt-6 flex gap-3">
            <button className="btn-secondary" onClick={() => setStep('about')}>
              Back
            </button>
            <button className="btn-primary flex-1" onClick={() => setStep('writing')}>
              Next ({known.size} known)
            </button>
          </div>
        </div>
      )}

      {step === 'writing' && (
        <div className="mt-2 space-y-5">
          <h1 className="text-[26px] font-bold tracking-tight">Answer like you&apos;d talk</h1>
          <p className="text-muted">Type, or tap the mic and say it. Don&apos;t try to be perfect. Natural is what we want to see.</p>
          {PLACEMENT_QUESTIONS.map((q, i) => (
            <AnswerBox key={q} question={q} value={answers[i]} onChange={(v) => setAnswers((a) => a.map((x, j) => (j === i ? v : x)))} />
          ))}
          {error && <ErrorBox message={error} onRetry={submit} />}
          {loading ? (
            <Spinner label="Analyzing your English…" />
          ) : (
            <div className="flex gap-3">
              <button className="btn-secondary" onClick={() => setStep('checklist')}>
                Back
              </button>
              <button className="btn-primary flex-1" disabled={answers.every((a) => !a.trim())} onClick={submit}>
                See my level
              </button>
            </div>
          )}
        </div>
      )}

      {step === 'result' && result && (
        <div className="mt-2 space-y-4">
          <h1 className="text-[26px] font-bold tracking-tight">{result.level}</h1>
          <p>{result.summary}</p>
          <div className="card">
            <p className="label">Strengths</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {result.strengths.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
            <p className="label mt-4">We&apos;ll work on</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {result.weakAreas.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </div>
          <p className="label">Your first phrases</p>
          <div className="space-y-2">
            {result.starterPhrases.map((p) => (
              <PhraseCard key={p.phrase} {...p} />
            ))}
          </div>
          <button className="btn-primary w-full" onClick={finish}>
            Let&apos;s go 🚀
          </button>
        </div>
      )}
    </div>
  );
}

function AnswerBox({ question, value, onChange }: { question: string; value: string; onChange: (v: string) => void }) {
  const rec = useSpeechRecognition();
  return (
    <div className="card">
      <p className="font-medium">{question}</p>
      <div className="mt-3 flex items-start gap-3">
        <textarea
          className="input min-h-[96px] flex-1"
          value={rec.listening ? [value, rec.transcript].filter(Boolean).join(' ') : value}
          onChange={(e) => onChange(e.target.value)}
          readOnly={rec.listening}
        />
        {rec.supported && (
          <MicButton
            listening={rec.listening}
            onStart={() => rec.start({ continuous: true })}
            onStop={async () => {
              const said = await rec.stop();
              if (said) onChange([value, said].filter(Boolean).join(' '));
            }}
          />
        )}
      </div>
      {rec.error && <p className="mt-2 text-sm text-bad">{rec.error}</p>}
    </div>
  );
}
