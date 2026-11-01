import { generate } from '@/lib/claude';
import { EXPLAIN_ASSESS_SYSTEM, learnerBlock } from '@/lib/prompts';
import { createRoute } from '@/lib/route';
import { ExplainAssessRequestSchema, ExplainReportSchema } from '@/lib/schemas';

export const maxDuration = 120;

export const POST = createRoute(ExplainAssessRequestSchema, async (b) => {
  const words = b.transcript.trim().split(/\s+/).length;
  const wpm = Math.round(words / (b.durationSec / 60));
  return generate({
    system: EXPLAIN_ASSESS_SYSTEM,
    schema: ExplainReportSchema,
    effort: 'high',
    user: `${learnerBlock(b.learner)}

What they're explaining: ${b.subjectName}
Background on ${b.subjectName} (from the learner, for context only): ${b.subjectDescription || '(not given)'}
Part they explained today: ${b.part}
Audience: ${b.audience}
Last session's focus: ${b.previousFocus || '(first session)'}
Duration: ${Math.round(b.durationSec)}s · ${words} words · ~${wpm} words per minute

Transcript:
<transcript>${b.transcript}</transcript>`,
  });
});
