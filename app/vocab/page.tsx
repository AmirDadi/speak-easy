'use client';
import Link from 'next/link';
import { useState } from 'react';
import { ErrorBox, MicButton, PageHeader, PhraseCard, ScorePill, Spinner } from '@/components/ui';
import { callApi } from '@/lib/api-client';
import { LEARNING_CONFIG } from '@/lib/config';
import { getLocalDate } from '@/lib/dates';
import type { VocabGrade, VocabPrompts } from '@/lib/schemas';
import { useSpeechRecognition } from '@/lib/speech';
import { computeNextReview, isMastered } from '@/lib/srs';
import { addPhrases, buildLearnerContext, getDueCards, markActive, mergeWeakAreas, type VocabCard } from '@/lib/state';
import { useAppState } from '@/lib/storage';

type Tab = 'practice' | 'bank';

export default function VocabPage() {
  const [tab, setTab] = useState<Tab>('practice');
  return (
    <div>
      <PageHeader title="Vocab" subtitle="Don't define it, use it. Write what you'd actually say." />
      <div className="mb-5 grid grid-cols-2 gap-1 rounded-2xl bg-line/60 p-1 text-sm font-semibold">
        {(['practice', 'bank'] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`rounded-xl py-2 ${tab === t ? 'bg-card shadow-sm' : 'text-muted'}`}>
            {t === 'practice' ? 'Practice' : 'My phrases'}
          </button>
        ))}
      </div>
      {tab === 'practice' ? <Practice /> : <Bank />}
    </div>
  );
}

interface Item {
  card: VocabCard;
  situation: string;
}

function Practice() {
  const [state, update, hydrated] = useAppState();
  const today = getLocalDate();
  const [items, setItems] = useState<Item[] | null>(null);
  const [pos, setPos] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<number[]>([]);

  if (!hydrated) return <Spinner />;

  const due = getDueCards(state, today);
  const all = Object.values(state.vocab);

  async function start(cards: VocabCard[]) {
    setLoading(true);
    setError(null);
    try {
      const res = await callApi<VocabPrompts>('/api/vocab/prompts', {
        learner: buildLearnerContext(state),
        phrases: cards.map((c) => ({ phrase: c.phrase, meaning: c.meaning })),
      });
      // Match prompts back to cards by phrase; fall back to position.
      const byPhrase = new Map(res.prompts.map((p) => [p.phrase.trim().toLowerCase(), p.situation]));
      setItems(
        cards.map((card, i) => ({
          card,
          situation: byPhrase.get(card.phrase.trim().toLowerCase()) ?? res.prompts[i]?.situation ?? `Use "${card.phrase}" in a sentence about your day.`,
        })),
      );
      setPos(0);
      setResults([]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <Spinner label="Setting up situations…" />;
  if (error) return <ErrorBox message={error} onRetry={() => setError(null)} />;

  if (!items) {
    if (all.length === 0) {
      return (
        <div className="card text-center">
          <p className="text-3xl">📭</p>
          <p className="mt-2 font-semibold">No phrases yet</p>
          <p className="mt-1 text-sm text-muted">Do today&apos;s shadowing to collect your first phrases.</p>
          <Link href="/shadowing" className="btn-primary mt-4">
            Go to shadowing
          </Link>
        </div>
      );
    }
    const extra = all
      .filter((c) => !due.includes(c) && !isMastered(c.srs))
      .sort((a, b) => a.srs.due.localeCompare(b.srs.due))
      .slice(0, LEARNING_CONFIG.VOCAB_SESSION_SIZE);
    return (
      <div className="card text-center">
        <p className="text-4xl font-bold tabular-nums">{due.length}</p>
        <p className="text-muted">phrases due today</p>
        {due.length > 0 ? (
          <button className="btn-primary mt-4 w-full" onClick={() => start(due.slice(0, LEARNING_CONFIG.VOCAB_SESSION_SIZE))}>
            Start ({Math.min(due.length, LEARNING_CONFIG.VOCAB_SESSION_SIZE)} situations)
          </button>
        ) : (
          <>
            <p className="mt-3 text-sm">You&apos;re all caught up! 🎉</p>
            {extra.length > 0 && (
              <button className="btn-secondary mt-4 w-full" onClick={() => start(extra)}>
                Extra practice anyway
              </button>
            )}
          </>
        )}
      </div>
    );
  }

  if (pos >= items.length) {
    const avg = results.length ? results.reduce((a, b) => a + b, 0) / results.length : 0;
    return (
      <div className="card text-center">
        <p className="text-3xl">💪</p>
        <p className="mt-2 text-lg font-semibold">Session done</p>
        <p className="text-muted">Average score {avg.toFixed(1)} / 5</p>
        <button className="btn-primary mt-4 w-full" onClick={() => setItems(null)}>
          Back
        </button>
      </div>
    );
  }

  const item = items[pos];
  return (
    <ItemCard
      key={item.card.id + pos}
      item={item}
      index={pos}
      total={items.length}
      onGraded={(grade, answer) => {
        setResults((r) => [...r, grade.score]);
        update((s) => {
          const card = s.vocab[item.card.id];
          if (!card) return s;
          const nextCard: VocabCard = {
            ...card,
            srs: computeNextReview(card.srs, grade.score, today),
            lastAnswer: { date: today, text: answer, score: grade.score, nativeVersion: grade.nativeVersion },
          };
          const withCard = { ...s, vocab: { ...s.vocab, [card.id]: nextCard } };
          const weak = grade.grammarFixes.length >= 2 ? mergeWeakAreas(s.profile.weakAreas, grade.grammarFixes.slice(0, 1)) : s.profile.weakAreas;
          return markActive({ ...withCard, profile: { ...withCard.profile, weakAreas: weak } }, today);
        });
      }}
      onNext={() => setPos((p) => p + 1)}
    />
  );
}

function ItemCard(props: { item: Item; index: number; total: number; onGraded: (g: VocabGrade, answer: string) => void; onNext: () => void }) {
  const [state] = useAppState();
  const { item } = props;
  const [answer, setAnswer] = useState('');
  const [showHint, setShowHint] = useState(false);
  const [grade, setGrade] = useState<VocabGrade | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rec = useSpeechRecognition();

  async function submit() {
    setLoading(true);
    setError(null);
    try {
      const g = await callApi<VocabGrade>('/api/vocab/grade', {
        learner: buildLearnerContext(state),
        phrase: item.card.phrase,
        meaning: item.card.meaning,
        situation: item.situation,
        answer,
      });
      setGrade(g);
      props.onGraded(g, answer);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const shown = rec.listening ? [answer, rec.transcript].filter(Boolean).join(' ') : answer;

  return (
    <div>
      <p className="mb-2 text-sm text-muted">
        {props.index + 1} / {props.total}
      </p>
      <div className="card">
        <p className="label">Situation</p>
        <p className="mt-1 text-[17px]">{item.situation}</p>
        <div className="mt-4 flex items-center justify-between">
          <p className="text-[20px] font-bold text-brand">“{item.card.phrase}”</p>
          <button className="text-sm text-muted underline" onClick={() => setShowHint((h) => !h)}>
            {showHint ? 'Hide' : 'Hint'}
          </button>
        </div>
        {showHint && <p className="mt-1 text-sm text-muted">{item.card.meaning}</p>}
      </div>

      {!grade && (
        <>
          <div className="mt-4 flex items-start gap-3">
            <textarea
              className="input min-h-[110px] flex-1"
              placeholder="Write (or say) your full sentence…"
              value={shown}
              readOnly={rec.listening}
              onChange={(e) => setAnswer(e.target.value)}
            />
            {rec.supported && (
              <MicButton
                listening={rec.listening}
                onStart={() => rec.start({ continuous: true })}
                onStop={async () => {
                  const said = await rec.stop();
                  if (said) setAnswer((a) => [a, said].filter(Boolean).join(' '));
                }}
              />
            )}
          </div>
          {error && (
            <div className="mt-3">
              <ErrorBox message={error} />
            </div>
          )}
          {loading ? (
            <Spinner label="Checking…" />
          ) : (
            <button className="btn-primary mt-4 w-full" disabled={!answer.trim() || rec.listening} onClick={submit}>
              Check my sentence
            </button>
          )}
        </>
      )}

      {grade && (
        <div className="mt-4 space-y-3">
          <div className="card">
            <div className="flex items-center justify-between">
              <p className="label">Your sentence</p>
              <ScorePill score={grade.score} max={5} />
            </div>
            <p className="mt-1 text-[16px]">{answer}</p>
            <p className="mt-3">{grade.feedback}</p>
            {grade.grammarFixes.length > 0 && (
              <ul className="mt-3 space-y-1 text-sm">
                {grade.grammarFixes.map((f) => (
                  <li key={f} className="rounded-lg bg-bg px-3 py-1.5">
                    {f}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="card border-2 border-good/30">
            <p className="label">How an American friend would say it</p>
            <p className="mt-1 text-[17px] font-medium">{grade.nativeVersion}</p>
          </div>
          <button className="btn-primary w-full" onClick={props.onNext}>
            Next ›
          </button>
        </div>
      )}
    </div>
  );
}

function Bank() {
  const [state, update, hydrated] = useAppState();
  const [q, setQ] = useState('');
  const [adding, setAdding] = useState(false);
  const [phrase, setPhrase] = useState('');
  const [meaning, setMeaning] = useState('');
  if (!hydrated) return <Spinner />;

  const today = getLocalDate();
  const cards = Object.values(state.vocab)
    .filter((c) => !q || c.phrase.toLowerCase().includes(q.toLowerCase()) || c.meaning.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => b.addedAt.localeCompare(a.addedAt));

  return (
    <div>
      <div className="mb-3 flex gap-2">
        <input className="input" placeholder="Search phrases" value={q} onChange={(e) => setQ(e.target.value)} />
        <button className="btn-secondary shrink-0" onClick={() => setAdding((a) => !a)}>
          + Add
        </button>
      </div>
      {adding && (
        <div className="card mb-4 space-y-2">
          <input className="input" placeholder="Phrase you heard, e.g. “I'm swamped”" value={phrase} onChange={(e) => setPhrase(e.target.value)} />
          <input className="input" placeholder="What it means (your words)" value={meaning} onChange={(e) => setMeaning(e.target.value)} />
          <button
            className="btn-primary w-full"
            disabled={!phrase.trim()}
            onClick={() => {
              update((s) => addPhrases(s, [{ phrase: phrase.trim(), meaning: meaning.trim() || '(added by you)', example: '', register: 'casual' }], 'manual', today));
              setPhrase('');
              setMeaning('');
              setAdding(false);
            }}
          >
            Add to my phrases
          </button>
          <p className="text-xs text-muted">
            Have lots of text or words? Paste them in <Link href="/profile" className="text-brand underline">Profile → Import</Link> and the coach will sort them out.
          </p>
        </div>
      )}
      <p className="mb-2 text-sm text-muted">{cards.length} phrases</p>
      <div className="space-y-2">
        {cards.map((c) => (
          <details key={c.id} className="card !p-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2">
              <span className="font-semibold">{c.phrase}</span>
              <span className={`chip text-xs ${isMastered(c.srs) ? 'border-good text-good' : c.srs.reps === 0 ? 'text-muted' : 'border-brand text-brand'}`}>
                {isMastered(c.srs) ? 'mastered' : c.srs.reps === 0 ? 'new' : `next: ${c.srs.due.slice(5)}`}
              </span>
            </summary>
            <div className="mt-3">
              <PhraseCard phrase={c.phrase} meaning={c.meaning} example={c.example} register={c.register} />
              {c.lastAnswer && (
                <p className="mt-2 text-sm text-muted">
                  Last time ({c.lastAnswer.score}/5): “{c.lastAnswer.text}” → <span className="text-ink">{c.lastAnswer.nativeVersion}</span>
                </p>
              )}
              <button
                className="mt-2 text-sm text-bad"
                onClick={() =>
                  update((s) => {
                    const vocab = { ...s.vocab };
                    delete vocab[c.id];
                    return { ...s, vocab, knownPhrases: [...s.knownPhrases, c.phrase] };
                  })
                }
              >
                I already know this, remove
              </button>
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
