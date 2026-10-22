'use client';
import { useRef, useState } from 'react';
import { ErrorBox, PageHeader, PhraseCard, Section, Spinner } from '@/components/ui';
import { callApi } from '@/lib/api-client';
import { getLocalDate } from '@/lib/dates';
import type { ImportResult } from '@/lib/schemas';
import { addPhrases, buildLearnerContext, mergeWeakAreas } from '@/lib/state';
import { exportBackup, importBackup, resetAll, useAppState } from '@/lib/storage';

export default function ProfilePage() {
  const [state, update, hydrated] = useAppState();
  if (!hydrated) return <Spinner />;
  const p = state.profile;

  const setField = (key: 'level' | 'interests' | 'goals' | 'notes' | 'passcode', value: string) =>
    update((s) => ({ ...s, profile: { ...s.profile, [key]: value } }));

  return (
    <div>
      <PageHeader title="Profile" subtitle="What your coach knows about you. Everything stays on this device." back="/" />

      <Section title="About you">
        <div className="card space-y-3">
          <Field label="Level" value={p.level} onChange={(v) => setField('level', v)} />
          <Field label="Interests" value={p.interests} onChange={(v) => setField('interests', v)} />
          <Field label="Goals" value={p.goals} onChange={(v) => setField('goals', v)} />
          <label className="block">
            <span className="label">Notes for your coach</span>
            <textarea
              className="input mt-1 min-h-[90px]"
              value={p.notes}
              placeholder="e.g. I mix up he/she. I want to sound less formal at work."
              onChange={(e) => setField('notes', e.target.value)}
            />
          </label>
        </div>
      </Section>

      <Section title="Weak areas being targeted">
        <div className="card">
          {p.weakAreas.length === 0 ? (
            <p className="text-sm text-muted">None yet. These come from your assessments.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {p.weakAreas.map((w) => (
                <button
                  key={w}
                  className="chip text-sm"
                  title="Remove"
                  onClick={() => update((s) => ({ ...s, profile: { ...s.profile, weakAreas: s.profile.weakAreas.filter((x) => x !== w) } }))}
                >
                  {w} <span className="ml-1 text-muted">×</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </Section>

      <ImportBox />

      <Section title="Passcode">
        <div className="card">
          <Field label="App passcode (matches APP_PASSCODE on the server)" value={p.passcode} onChange={(v) => setField('passcode', v)} type="password" />
        </div>
      </Section>

      <Backup />
    </div>
  );
}

function Field({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <input className="input mt-1" type={type} value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

function ImportBox() {
  const [state, update] = useAppState();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  async function analyze() {
    setBusy(true);
    setError(null);
    try {
      const r = await callApi<ImportResult>('/api/import', { learner: buildLearnerContext(state), text });
      const today = getLocalDate();
      update((s) => {
        const next = addPhrases(s, r.phrases, 'import', today);
        return { ...next, profile: { ...next.profile, weakAreas: mergeWeakAreas(next.profile.weakAreas, r.weakAreas) } };
      });
      setResult(r);
      setText('');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Section title="Teach your coach about you">
      <div className="card">
        <p className="text-sm text-muted">
          Paste anything: a message or email you wrote in English, a chat you had, or a list of words you heard and didn&apos;t understand. The
          coach will learn your patterns and add useful phrases to your vocab.
        </p>
        <textarea className="input mt-3 min-h-[120px]" value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste here…" />
        {error && (
          <div className="mt-2">
            <ErrorBox message={error} />
          </div>
        )}
        {busy ? (
          <Spinner label="Reading…" />
        ) : (
          <button className="btn-primary mt-3 w-full" disabled={!text.trim()} onClick={analyze}>
            Analyze &amp; add
          </button>
        )}
        {result && (
          <div className="mt-4 space-y-3">
            {result.observations.length > 0 && (
              <ul className="list-disc space-y-1 pl-5 text-[15px]">
                {result.observations.map((o) => (
                  <li key={o}>{o}</li>
                ))}
              </ul>
            )}
            {result.phrases.map((ph) => (
              <PhraseCard key={ph.phrase} {...ph} />
            ))}
          </div>
        )}
      </div>
    </Section>
  );
}

function Backup() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<string | null>(null);

  function download() {
    const blob = new Blob([exportBackup()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `speak-easy-backup-${getLocalDate()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Section title="Backup">
      <div className="card space-y-3">
        <p className="text-sm text-muted">
          Your progress lives only on this device. Download a backup now and then, especially before clearing browser data or switching phones.
        </p>
        <div className="flex gap-2">
          <button className="btn-secondary flex-1" onClick={download}>
            Download backup
          </button>
          <button className="btn-secondary flex-1" onClick={() => fileRef.current?.click()}>
            Restore
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            const r = importBackup(await f.text());
            setMsg(r.ok ? 'Restored ✓' : r.error);
          }}
        />
        {msg && <p className="text-sm">{msg}</p>}
        <button
          className="w-full pt-2 text-sm text-bad"
          onClick={() => {
            if (window.confirm('Delete all progress on this device? This cannot be undone.')) {
              resetAll();
              window.location.href = '/onboarding';
            }
          }}
        >
          Reset everything
        </button>
      </div>
    </Section>
  );
}
