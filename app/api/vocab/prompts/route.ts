import { generate } from '@/lib/claude';
import { learnerBlock, VOCAB_PROMPT_SYSTEM } from '@/lib/prompts';
import { createRoute } from '@/lib/route';
import { VocabPromptRequestSchema, VocabPromptsSchema } from '@/lib/schemas';

export const maxDuration = 60;

export const POST = createRoute(VocabPromptRequestSchema, async ({ learner, phrases }) =>
  generate({
    system: VOCAB_PROMPT_SYSTEM,
    schema: VocabPromptsSchema,
    effort: 'low',
    user: `${learnerBlock(learner)}

Phrases:
${phrases.map((p) => `- "${p.phrase}" — ${p.meaning}`).join('\n')}`,
  }),
);
