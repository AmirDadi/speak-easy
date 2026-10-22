# Speak Easy 🎙

A personal American English coach for upper-intermediate learners who want to sound **natural, casual and fun**, not textbook-formal. Built as an installable phone web app (PWA).

## What it does

| Track | How often | What happens |
|---|---|---|
| 🎧 **Shadowing** | Daily, ~10 min | A fresh, realistic American conversation built around 5–7 casual phrases you *don't* know yet. Listen (0.75× / 0.9× / 1×), then repeat each line into the mic. Missed words are highlighted. New phrases go to your vocab bank. |
| ✍️ **Vocab in sentences** | Daily, due cards | Never "what does X mean?" You get a real-life situation and must **use the phrase in a full sentence** (typed or spoken). Graded 0–5, with fixes and how an American friend would say it. Spaced repetition decides when each phrase comes back. |
| 🎙 **Weekly speaking** | Every 7 days | A social topic + 60 s prep, then talk for 2–3 min. You get a report card (fluency, vocabulary, grammar, naturalness, engagement), your top fixes ("you said → try"), and one focus for next week, which is checked the following week. |
| 🎉 **Social & fun** | Anytime | 8 "conversation move" lessons (react, follow up, jump in, have an opinion, share, be playful, tell a story, rescue a dying conversation), plus AI role-plays (house party, group chat, coworkers lunch…) where characters are already talking and you practice jumping in. Live coach tips + a debrief on missed chances to join or joke. |

**It learns what you know:** onboarding (interests, phrase checklist, short writing sample → level + weak areas), every exercise updates your profile, and **Profile → Teach your coach** lets you paste things you wrote or words you heard so they get worked in. Phrases you already know are never taught as new.

## Setup

```bash
npm install
cp .env.example .env.local   # add your ANTHROPIC_API_KEY
npm run dev                  # http://localhost:3000
```

### Put it on your phone
1. Deploy (easiest: [Vercel](https://vercel.com/new) → import this repo → add `ANTHROPIC_API_KEY` and `APP_PASSCODE` env vars).
2. Open the URL in **Safari (iPhone)** or **Chrome (Android)** → Share → **Add to Home Screen**.
3. In the app: Profile → Passcode → enter the same `APP_PASSCODE` (stops strangers from using your API key).

Speech recognition and text-to-speech use the browser's built-in engines (free). Chrome and Safari both support them. For the most natural voices on iPhone: Settings → Accessibility → Spoken Content → Voices → English (US) → download an "Enhanced" or "Premium" voice.

## Your data
All progress is stored **on your device** (localStorage). Nothing is saved on a server. Use **Profile → Download backup** regularly; restore it on a new phone with **Restore**.

## Tech
Next.js 14 (App Router) · TypeScript · Tailwind · Zod · Anthropic SDK (Claude with structured outputs) · Web Speech API.

```
lib/          pure logic (SRS, speech comparison, state, prompts, schemas)
app/api/      thin routes: passcode → validate → Claude → JSON
app/          pages: today, onboarding, shadowing, vocab, speaking, social, profile
tests/        vitest
```

```bash
npm run test:run   # unit tests
npm run typecheck
npm run build
```

Tunables (session sizes, intervals, pass thresholds, model) live in `lib/config.ts`.

## Limitations
- Pronunciation feedback is based on what speech-to-text *heard*, not acoustic analysis. A word you said that it didn't recognize shows as missed. Good enough to catch skipped or mumbled words, not a phonetics lab.
- Firefox doesn't support speech recognition; use Chrome or Safari.
