/**
 * Zod schemas for everything that crosses a trust boundary: request bodies
 * coming from the browser, and structured output coming back from Claude.
 * Types are derived from these — don't hand-maintain parallel interfaces.
 */
import { z } from 'zod';

// ---------------------------------------------------------------------------
// Learner context (sent from the browser with every AI request — the profile
// lives on-device, so the server is stateless and only sees this summary).
// ---------------------------------------------------------------------------

export const LearnerContextSchema = z.object({
  level: z.string().max(200),
  goals: z.string().max(1000),
  interests: z.string().max(1000),
  knownPhrases: z.array(z.string().max(80)).max(400),
  learningPhrases: z.array(z.string().max(80)).max(200),
  weakAreas: z.array(z.string().max(200)).max(30),
  notes: z.string().max(4000),
});
export type LearnerContext = z.infer<typeof LearnerContextSchema>;

// ---------------------------------------------------------------------------
// Shadowing
// ---------------------------------------------------------------------------

export const PhraseSchema = z.object({
  phrase: z.string().describe('The casual phrase exactly as used in the dialogue'),
  meaning: z.string().describe('Short plain-English explanation'),
  example: z.string().describe('A different everyday example sentence'),
  register: z.string().describe('e.g. "casual", "very casual / slang", "neutral"'),
});
export type Phrase = z.infer<typeof PhraseSchema>;

export const DialogueLineSchema = z.object({
  speaker: z.string(),
  text: z.string(),
  note: z
    .string()
    .describe('Optional pronunciation/connected-speech tip for this line, empty string if none'),
});
export type DialogueLine = z.infer<typeof DialogueLineSchema>;

export const ShadowingSchema = z.object({
  title: z.string(),
  setting: z.string().describe('One sentence describing where/who'),
  speakers: z.array(z.string()).min(2).max(3),
  lines: z.array(DialogueLineSchema).min(8).max(20),
  phrases: z.array(PhraseSchema).min(4).max(8),
  listeningTip: z.string().describe('One American-English sound pattern to notice today'),
});
export type Shadowing = z.infer<typeof ShadowingSchema>;

export const ShadowingRequestSchema = z.object({
  learner: LearnerContextSchema,
  recentTitles: z.array(z.string().max(120)).max(30),
});

// ---------------------------------------------------------------------------
// Vocab — sentence production, graded
// ---------------------------------------------------------------------------

export const VocabPromptRequestSchema = z.object({
  learner: LearnerContextSchema,
  phrases: z
    .array(z.object({ phrase: z.string().max(80), meaning: z.string().max(300) }))
    .min(1)
    .max(12),
});

export const VocabPromptsSchema = z.object({
  prompts: z.array(
    z.object({
      phrase: z.string(),
      situation: z
        .string()
        .describe('A realistic everyday situation the learner must respond to, in 1-2 sentences'),
    }),
  ),
});
export type VocabPrompts = z.infer<typeof VocabPromptsSchema>;

export const VocabGradeRequestSchema = z.object({
  learner: LearnerContextSchema,
  phrase: z.string().max(80),
  meaning: z.string().max(300),
  situation: z.string().max(600),
  answer: z.string().min(1).max(600),
});

export const VocabGradeSchema = z.object({
  score: z.number().int().min(0).max(5).describe('0 = wrong/missing, 3 = understandable but unnatural, 5 = native-like'),
  usedCorrectly: z.boolean(),
  feedback: z.string().describe('2-3 sentences, friendly and specific'),
  nativeVersion: z.string().describe('How an American friend would naturally say it'),
  grammarFixes: z.array(z.string()).describe('Short "X → Y" fixes; empty if none'),
});
export type VocabGrade = z.infer<typeof VocabGradeSchema>;

// ---------------------------------------------------------------------------
// Weekly speaking
// ---------------------------------------------------------------------------

export const SpeakingTopicRequestSchema = z.object({
  learner: LearnerContextSchema,
  recentTopics: z.array(z.string().max(200)).max(30),
});

export const SpeakingTopicSchema = z.object({
  topic: z.string(),
  prompt: z.string().describe('What to talk about, 2-3 sentences, conversational'),
  guidingQuestions: z.array(z.string()).min(3).max(5),
  usefulPhrases: z.array(z.string()).min(3).max(6),
});
export type SpeakingTopic = z.infer<typeof SpeakingTopicSchema>;

export const SpeakingAssessRequestSchema = z.object({
  learner: LearnerContextSchema,
  topic: z.string().max(300),
  prompt: z.string().max(1000),
  transcript: z.string().min(1).max(12000),
  durationSec: z.number().min(1).max(1800),
  previousFocus: z.string().max(500),
});

const RubricScore = z.object({
  score: z.number().int().min(1).max(10),
  comment: z.string(),
});

export const SpeakingReportSchema = z.object({
  overall: z.number().int().min(1).max(10),
  summary: z.string().describe('2-3 sentences, honest and encouraging'),
  fluency: RubricScore,
  vocabulary: RubricScore,
  grammar: RubricScore,
  naturalness: RubricScore,
  engagement: RubricScore.describe('Would a listener enjoy this? Stories, opinions, humor, energy'),
  strengths: z.array(z.string()).min(1).max(4),
  topFixes: z
    .array(z.object({ youSaid: z.string(), tryInstead: z.string(), why: z.string() }))
    .min(1)
    .max(5),
  newPhrasesToLearn: z.array(PhraseSchema).max(5),
  nextWeekFocus: z.string().describe('One concrete thing to practice this week'),
  weakAreas: z.array(z.string()).max(5).describe('Short labels of recurring weaknesses'),
});
export type SpeakingReport = z.infer<typeof SpeakingReportSchema>;

// ---------------------------------------------------------------------------
// Explain it — describe one part of the learner's subject (e.g. their product)
// ---------------------------------------------------------------------------

export const ExplainAssessRequestSchema = z.object({
  learner: LearnerContextSchema,
  subjectName: z.string().min(1).max(80),
  subjectDescription: z.string().max(2000),
  part: z.string().min(1).max(200),
  audience: z.string().max(200),
  transcript: z.string().min(1).max(20000),
  durationSec: z.number().min(1).max(1800),
  previousFocus: z.string().max(500),
});

export const ExplainReportSchema = z.object({
  overall: z.number().int().min(1).max(10),
  summary: z.string().describe('2-3 sentences, honest and encouraging'),
  structure: RubricScore.describe('Was there a clear opening, logical order, transitions and a wrap-up?'),
  clarity: RubricScore.describe('Would this audience understand it? Jargon explained, examples used?'),
  vocabulary: RubricScore.describe('Precise, varied, natural word choice'),
  howYouStructuredIt: z.array(z.string()).max(8).describe('The actual order of their explanation, one short line per section'),
  betterStructure: z.array(z.string()).min(3).max(7).describe('A stronger outline for this explanation, one line per step'),
  wordUpgrades: z
    .array(z.object({ youSaid: z.string(), better: z.string(), why: z.string() }))
    .min(1)
    .max(8)
    .describe('Quote their words; suggest more precise or natural wording'),
  structurePhrases: z
    .array(PhraseSchema)
    .max(5)
    .describe('Signposting/explaining phrases they should learn, e.g. "The way it works is…", "Think of it like…"'),
  nextTimeFocus: z.string().describe('One concrete thing to do differently next session'),
});
export type ExplainReport = z.infer<typeof ExplainReportSchema>;

// ---------------------------------------------------------------------------
// Social & fun — role-play
// ---------------------------------------------------------------------------

export const RoleplayMessageSchema = z.object({
  speaker: z.string().max(40),
  text: z.string().max(1200),
});
export type RoleplayMessage = z.infer<typeof RoleplayMessageSchema>;

export const RoleplayStartRequestSchema = z.object({
  learner: LearnerContextSchema,
  scenarioId: z.string().max(60),
  scenarioBrief: z.string().max(600),
  skillFocus: z.string().max(300),
});

export const RoleplayStartSchema = z.object({
  scene: z.string().describe('2 sentences setting the scene for the learner'),
  characters: z
    .array(z.object({ name: z.string(), vibe: z.string().describe('3-6 words on personality') }))
    .min(1)
    .max(3),
  opening: z.array(RoleplayMessageSchema).min(2).max(5),
  hint: z.string().describe('A tiny nudge on how the learner could jump in'),
});
export type RoleplayStart = z.infer<typeof RoleplayStartSchema>;

export const RoleplayTurnRequestSchema = z.object({
  learner: LearnerContextSchema,
  scene: z.string().max(600),
  characters: z.array(z.object({ name: z.string().max(40), vibe: z.string().max(80) })).max(3),
  skillFocus: z.string().max(300),
  history: z.array(RoleplayMessageSchema).min(1).max(60),
});

export const RoleplayTurnSchema = z.object({
  replies: z.array(RoleplayMessageSchema).min(1).max(3),
  coachTip: z
    .string()
    .describe('One short, optional tip on the learner\'s LAST message (empty string if it was great)'),
});
export type RoleplayTurn = z.infer<typeof RoleplayTurnSchema>;

export const RoleplayFeedbackRequestSchema = z.object({
  learner: LearnerContextSchema,
  scene: z.string().max(600),
  skillFocus: z.string().max(300),
  history: z.array(RoleplayMessageSchema).min(2).max(60),
});

export const RoleplayFeedbackSchema = z.object({
  confidence: z.number().int().min(1).max(10).describe('How actively the learner contributed'),
  fun: z.number().int().min(1).max(10).describe('How playful/engaging the learner was'),
  summary: z.string(),
  bestMoment: z.string().describe('Quote the learner\'s best line and say why it worked'),
  missedChances: z
    .array(z.object({ moment: z.string(), couldHaveSaid: z.string() }))
    .max(4)
    .describe('Moments where the learner could have jumped in, joked, or asked a follow-up'),
  rewrites: z
    .array(z.object({ original: z.string(), moreNatural: z.string() }))
    .max(4),
  phrasesToSteal: z.array(PhraseSchema).max(4),
});
export type RoleplayFeedback = z.infer<typeof RoleplayFeedbackSchema>;

// ---------------------------------------------------------------------------
// Onboarding — placement assessment
// ---------------------------------------------------------------------------

export const PlacementRequestSchema = z.object({
  answers: z
    .array(z.object({ question: z.string().max(300), answer: z.string().max(3000) }))
    .min(1)
    .max(10),
  selfDescription: z.string().max(1500),
  knownFromChecklist: z.array(z.string().max(80)).max(200),
  unknownFromChecklist: z.array(z.string().max(80)).max(200),
});

export const PlacementSchema = z.object({
  level: z.string().describe('e.g. "B2 — upper-intermediate"'),
  summary: z.string(),
  strengths: z.array(z.string()).max(5),
  weakAreas: z.array(z.string()).max(6),
  starterPhrases: z.array(PhraseSchema).min(5).max(10),
});
export type Placement = z.infer<typeof PlacementSchema>;

// ---------------------------------------------------------------------------
// Import — "here's stuff I wrote / heard, work it in"
// ---------------------------------------------------------------------------

export const ImportRequestSchema = z.object({
  learner: LearnerContextSchema,
  text: z.string().min(1).max(8000),
});

export const ImportSchema = z.object({
  observations: z.array(z.string()).max(6).describe('Patterns noticed in the learner\'s English'),
  weakAreas: z.array(z.string()).max(5),
  phrases: z.array(PhraseSchema).max(10).describe('Casual phrases worth adding to the vocab bank'),
});
export type ImportResult = z.infer<typeof ImportSchema>;
