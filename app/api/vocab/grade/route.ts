import { generate } from '@/lib/claude';
import { learnerBlock, VOCAB_GRADE_SYSTEM } from '@/lib/prompts';
import { createRoute } from '@/lib/route';
import { VocabGradeRequestSchema, VocabGradeSchema } from '@/lib/schemas';

export const maxDuration = 60;

export const POST = createRoute(VocabGradeRequestSchema, async (b) =>
  generate({
    system: VOCAB_GRADE_SYSTEM,
    schema: VocabGradeSchema,
    effort: 'low',
    user: `${learnerBlock(b.learner)}

Target phrase: "${b.phrase}" (${b.meaning})
Situation: ${b.situation}
Learner's answer: <answer>${b.answer}</answer>`,
  }),
);
