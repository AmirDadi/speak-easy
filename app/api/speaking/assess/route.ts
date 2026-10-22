import { generate } from '@/lib/claude';
import { learnerBlock, SPEAKING_ASSESS_SYSTEM } from '@/lib/prompts';
import { createRoute } from '@/lib/route';
import { SpeakingAssessRequestSchema, SpeakingReportSchema } from '@/lib/schemas';

export const maxDuration = 120;

export const POST = createRoute(SpeakingAssessRequestSchema, async (b) => {
  const words = b.transcript.trim().split(/\s+/).length;
  const wpm = Math.round(words / (b.durationSec / 60));
  return generate({
    system: SPEAKING_ASSESS_SYSTEM,
    schema: SpeakingReportSchema,
    effort: 'high',
    user: `${learnerBlock(b.learner)}

Topic: ${b.topic}
Prompt they were given: ${b.prompt}
Last week's focus: ${b.previousFocus || '(first session)'}
Duration: ${Math.round(b.durationSec)}s · ${words} words · ~${wpm} words per minute

Transcript:
<transcript>${b.transcript}</transcript>`,
  });
});
