import { generate } from '@/lib/claude';
import { learnerBlock, ROLEPLAY_FEEDBACK_SYSTEM } from '@/lib/prompts';
import { createRoute } from '@/lib/route';
import { RoleplayFeedbackRequestSchema, RoleplayFeedbackSchema } from '@/lib/schemas';

export const maxDuration = 120;

export const POST = createRoute(RoleplayFeedbackRequestSchema, async (b) =>
  generate({
    system: ROLEPLAY_FEEDBACK_SYSTEM,
    schema: RoleplayFeedbackSchema,
    user: `${learnerBlock(b.learner)}

Scene: ${b.scene}
Skill the learner was practicing: ${b.skillFocus}

Full conversation (learner = "You"):
${b.history.map((m) => `${m.speaker}: ${m.text}`).join('\n')}`,
  }),
);
