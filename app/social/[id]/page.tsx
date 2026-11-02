'use client';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { PageHeader } from '@/components/ui';
import { getLocalDate } from '@/lib/dates';
import { getMove, getScenario } from '@/lib/social-content';
import { castVoices, say } from '@/lib/tts';
import { addPhrases, markActive } from '@/lib/state';
import { useAppState } from '@/lib/storage';

export default function MovePage() {
  const { id } = useParams<{ id: string }>();
  const move = getMove(id);
  const [state, update] = useAppState();
  // "You" lines get a different voice from the other person in the example.
  const cast = castVoices([{ name: 'You', voice: 'male' }, { name: 'other', voice: 'female' }]);
  const play = (text: string, speaker: string) =>
    say(text, { voice: cast.cloud(speaker === 'You' ? 'You' : 'other'), fallbackVoice: cast.local(speaker), rate: 0.95 });

  if (!move) {
    return <PageHeader title="Not found" back="/social" />;
  }
  const scenario = getScenario(move.scenarioId);
  const completed = state.completedLessons.includes(move.id);

  function complete() {
    if (!move) return;
    const today = getLocalDate();
    update((s) =>
      markActive(
        {
          ...addPhrases(
            s,
            move.phrases.map((p) => ({ phrase: p.phrase, meaning: p.use, example: '', register: 'casual' })),
            'social',
            today,
          ),
          completedLessons: s.completedLessons.includes(move.id) ? s.completedLessons : [...s.completedLessons, move.id],
        },
        today,
      ),
    );
  }

  return (
    <div>
      <PageHeader title={move.title} subtitle={move.tagline} back="/social" />

      <div className="card mb-4">
        <p className="label">Why it matters</p>
        <p className="mt-1 text-[16px]">{move.why}</p>
      </div>

      <p className="label mb-2">Phrases to steal</p>
      <div className="card mb-4 divide-y divide-line !p-0">
        {move.phrases.map((p) => (
          <button key={p.phrase} className="flex w-full items-center gap-3 px-5 py-3 text-left" onClick={() => play(p.phrase, 'other')}>
            <span className="text-brand">▶</span>
            <span className="flex-1">
              <span className="block font-semibold">{p.phrase}</span>
              <span className="text-sm text-muted">{p.use}</span>
            </span>
          </button>
        ))}
      </div>

      <p className="label mb-2">See it in action</p>
      <div className="card mb-4 space-y-2">
        {move.example.map((l, i) => (
          <div key={i} className={`flex ${l.speaker === 'You' ? 'justify-end' : ''}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-2 ${l.speaker === 'You' ? 'bg-brand text-white' : 'bg-bg'}`}>
              {l.speaker !== 'You' && <p className="text-xs font-bold text-brand">{l.speaker}</p>}
              <p>{l.text}</p>
            </div>
          </div>
        ))}
        <button className="mt-2 text-sm font-medium text-brand" onClick={async () => {
          for (const l of move.example) await play(l.text, l.speaker);
        }}>
          ▶ Listen
        </button>
      </div>

      <div className="card mb-5 border-2 border-warn/40">
        <p className="label">Real-life challenge</p>
        <p className="mt-1 text-[16px] font-medium">{move.tryIt}</p>
      </div>

      <div className="flex flex-col gap-3">
        {scenario && (
          <Link href={`/social/roleplay/${scenario.id}?move=${move.id}`} className="btn-primary" onClick={complete}>
            Practice it: {scenario.emoji} {scenario.title}
          </Link>
        )}
        {!completed && (
          <button className="btn-secondary" onClick={complete}>
            Mark as learned &amp; add phrases to vocab
          </button>
        )}
      </div>
    </div>
  );
}
