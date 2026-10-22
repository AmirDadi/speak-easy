/**
 * Word-level comparison of what the learner said (speech-to-text) against the
 * target line, for shadowing feedback. Pure.
 *
 * Uses an LCS alignment so one missed word doesn't cascade into "everything
 * after it is wrong" like a naive index-by-index comparison would.
 */

export interface WordResult {
  word: string;
  matched: boolean;
}

export interface CompareResult {
  words: WordResult[];
  ratio: number;
  extra: string[];
}

// Speech recognisers often expand or contract; treat these as equivalent.
const EQUIVALENTS: Record<string, string> = {
  gonna: 'going to',
  wanna: 'want to',
  gotta: 'got to',
  kinda: 'kind of',
  sorta: 'sort of',
  lemme: 'let me',
  gimme: 'give me',
  "y'all": 'you all',
  ok: 'okay',
};

export function normalizeWords(text: string): string[] {
  const lowered = text
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[^a-z0-9' ]+/g, ' ');
  const expanded = lowered
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => EQUIVALENTS[w] ?? w)
    .join(' ');
  return expanded.split(/\s+/).filter(Boolean).map((w) => w.replace(/^'+|'+$/g, ''));
}

export function compareSpeech(target: string, spoken: string): CompareResult {
  const displayWords = target.split(/\s+/).filter(Boolean);
  const t = normalizeWords(target);
  const s = normalizeWords(spoken);

  // LCS table
  const dp: number[][] = Array.from({ length: t.length + 1 }, () => new Array(s.length + 1).fill(0));
  for (let i = t.length - 1; i >= 0; i--) {
    for (let j = s.length - 1; j >= 0; j--) {
      dp[i][j] = t[i] === s[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const matchedT = new Array(t.length).fill(false);
  const matchedS = new Array(s.length).fill(false);
  let i = 0;
  let j = 0;
  while (i < t.length && j < s.length) {
    if (t[i] === s[j]) {
      matchedT[i] = matchedS[j] = true;
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) i++;
    else j++;
  }

  const ratio = t.length === 0 ? 0 : matchedT.filter(Boolean).length / t.length;
  const extra = s.filter((_, k) => !matchedS[k]);

  // Map normalized-token matches back onto the display words. A display word
  // can expand to several tokens ("gonna" → "going to"); it counts as matched
  // only if all of its tokens matched.
  const words: WordResult[] = [];
  let cursor = 0;
  for (const dw of displayWords) {
    const n = normalizeWords(dw).length;
    const slice = matchedT.slice(cursor, cursor + n);
    words.push({ word: dw, matched: n > 0 ? slice.every(Boolean) : true });
    cursor += n;
  }

  return { words, ratio, extra };
}
