'use client';
/**
 * Browser speech: text-to-speech (American voices) and speech-to-text.
 * Both are built into Chrome, Edge and Safari (incl. iOS) — no extra API cost.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

// ---------------------------------------------------------------------------
// Text-to-speech
// ---------------------------------------------------------------------------

// Apple ships joke/sound-effect voices tagged en-US; never use them.
const NOVELTY_VOICES =
  /albert|bad news|bahh|bells|boing|bubbles|cellos|good news|jester|organ|superstar|trinoids|whisper|wobble|zarvox|deranged|hysterical|pipe organ|junior|ralph|fred|kathy|princess|grandma|grandpa|rocko|shelley|eddy|flo|reed|sandy/i;

/** en-US voices, best-sounding first ("Natural"/"Enhanced"/Google voices beat the robotic defaults). */
export function getUsVoices(): SpeechSynthesisVoice[] {
  if (typeof window === 'undefined' || !window.speechSynthesis) return [];
  const voices = window.speechSynthesis
    .getVoices()
    .filter((v) => v.lang.replace('_', '-').startsWith('en-US') && !NOVELTY_VOICES.test(v.name));
  const rank = (v: SpeechSynthesisVoice) =>
    /natural|neural|enhanced|premium/i.test(v.name) ? 0 : /google|samantha|aria|jenny|guy|alex/i.test(v.name) ? 1 : 2;
  return voices.sort((a, b) => rank(a) - rank(b));
}

export function useUsVoices(): SpeechSynthesisVoice[] {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  useEffect(() => {
    if (!window.speechSynthesis) return;
    const load = () => setVoices(getUsVoices());
    load();
    window.speechSynthesis.addEventListener('voiceschanged', load);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', load);
  }, []);
  return voices;
}

export function speak(text: string, opts: { rate?: number; voice?: SpeechSynthesisVoice | null } = {}): Promise<void> {
  return new Promise((resolve) => {
    if (!window.speechSynthesis) return resolve();
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-US';
    u.rate = opts.rate ?? 1;
    if (opts.voice) u.voice = opts.voice;
    u.onend = () => resolve();
    u.onerror = () => resolve();
    window.speechSynthesis.speak(u);
  });
}

export function stopSpeaking() {
  if (typeof window !== 'undefined') window.speechSynthesis?.cancel();
}

// ---------------------------------------------------------------------------
// Speech-to-text
// ---------------------------------------------------------------------------

// The Web Speech recognition API isn't in TypeScript's DOM lib yet.
interface RecognitionResult {
  isFinal: boolean;
  0: { transcript: string };
}
interface RecognitionEvent {
  resultIndex: number;
  results: ArrayLike<RecognitionResult>;
}
interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: RecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
}
type RecognitionCtor = new () => Recognition;

function getRecognitionCtor(): RecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function useSpeechRecognition() {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [finalText, setFinalText] = useState('');
  const [interim, setInterim] = useState('');
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<Recognition | null>(null);
  // Whether the caller still wants to listen. Browsers end recognition on
  // their own after silence (especially iOS), so for long sessions we restart
  // until the caller explicitly stops.
  const wantRef = useRef(false);
  const continuousRef = useRef(false);
  const finalRef = useRef('');
  const interimRef = useRef('');
  const stopResolvers = useRef<((text: string) => void)[]>([]);
  const activeRef = useRef(false);

  useEffect(() => setSupported(getRecognitionCtor() !== null), []);

  const startInstance = useCallback(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) return;
    const rec = new Ctor();
    rec.lang = 'en-US';
    rec.continuous = continuousRef.current;
    rec.interimResults = true;
    rec.onresult = (e) => {
      let interimChunk = '';
      let finalChunk = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalChunk += r[0].transcript + ' ';
        else interimChunk += r[0].transcript;
      }
      if (finalChunk) {
        finalRef.current = (finalRef.current + ' ' + finalChunk).replace(/\s+/g, ' ').trim();
        setFinalText(finalRef.current);
      }
      interimRef.current = interimChunk;
      setInterim(interimChunk);
    };
    rec.onerror = (e) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        wantRef.current = false;
        setError('Microphone permission was denied. Allow mic access in your browser settings.');
      } else if (e.error !== 'no-speech' && e.error !== 'aborted') {
        setError(`Speech recognition error: ${e.error}`);
      }
    };
    rec.onend = () => {
      // Some browsers end without promoting the last interim chunk to final.
      if (interimRef.current) {
        finalRef.current = (finalRef.current + ' ' + interimRef.current).replace(/\s+/g, ' ').trim();
        setFinalText(finalRef.current);
        interimRef.current = '';
      }
      setInterim('');
      if (wantRef.current && continuousRef.current) {
        try {
          startInstance();
          return;
        } catch {
          /* fall through to stopped */
        }
      }
      wantRef.current = false;
      activeRef.current = false;
      setListening(false);
      const resolvers = stopResolvers.current;
      stopResolvers.current = [];
      resolvers.forEach((r) => r(finalRef.current));
    };
    recRef.current = rec;
    activeRef.current = true;
    rec.start();
  }, []);

  const start = useCallback(
    (opts: { continuous?: boolean; keepText?: boolean } = {}) => {
      setError(null);
      if (!opts.keepText) {
        finalRef.current = '';
        setFinalText('');
      }
      interimRef.current = '';
      setInterim('');
      continuousRef.current = opts.continuous ?? false;
      wantRef.current = true;
      setListening(true);
      try {
        startInstance();
      } catch {
        wantRef.current = false;
        activeRef.current = false;
        setListening(false);
        setError('Could not start the microphone.');
      }
    },
    [startInstance],
  );

  /** Stops listening; resolves with the full text once the last result has arrived. */
  const stop = useCallback((): Promise<string> => {
    wantRef.current = false;
    // Already ended (e.g. browser stopped on silence): onend won't fire again.
    if (!recRef.current || !activeRef.current) return Promise.resolve(finalRef.current);
    const done = new Promise<string>((resolve) => stopResolvers.current.push(resolve));
    recRef.current.stop();
    return done;
  }, []);

  const reset = useCallback(() => {
    finalRef.current = '';
    interimRef.current = '';
    setFinalText('');
    setInterim('');
  }, []);

  useEffect(
    () => () => {
      wantRef.current = false;
      recRef.current?.abort();
    },
    [],
  );

  const transcript = (finalText + ' ' + interim).replace(/\s+/g, ' ').trim();
  return { supported, listening, transcript, finalText, error, start, stop, reset };
}
