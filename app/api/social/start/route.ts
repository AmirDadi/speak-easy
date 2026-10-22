import { generate } from '@/lib/claude';
import { learnerBlock, ROLEPLAY_START_SYSTEM } from '@/lib/prompts';
import { createRoute } from '@/lib/route';
import { RoleplayStartRequestSchema, RoleplayStartSchema } from '@/lib/schemas';

export const maxDuration = 60;

export const POST = createRoute(RoleplayStartRequestSchema, async (b) =>
  generate({
    system: ROLEPLAY_START_SYSTEM,
    schema: RoleplayStartSchema,
    effort: 'low',
    user: `${learnerBlock(b.learner)}

Scenario: ${b.scenarioBrief}
Skill the learner is practicing: ${b.skillFocus}`,
  }),
);
