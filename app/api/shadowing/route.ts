import { generate } from '@/lib/claude';
import { learnerBlock, SHADOWING_SYSTEM } from '@/lib/prompts';
import { createRoute } from '@/lib/route';
import { ShadowingRequestSchema, ShadowingSchema } from '@/lib/schemas';

export const maxDuration = 60;

export const POST = createRoute(ShadowingRequestSchema, async ({ learner, recentTitles }) =>
  generate({
    system: SHADOWING_SYSTEM,
    schema: ShadowingSchema,
    user: `${learnerBlock(learner)}

Recent dialogue titles (pick a different setting): ${recentTitles.join('; ') || '(none)'}

Write today's dialogue.`,
  }),
);
