import { generate } from '@/lib/claude';
import { learnerBlock, ROLEPLAY_TURN_SYSTEM } from '@/lib/prompts';
import { createRoute } from '@/lib/route';
import { RoleplayTurnRequestSchema, RoleplayTurnSchema } from '@/lib/schemas';

export const maxDuration = 60;

export const POST = createRoute(RoleplayTurnRequestSchema, async (b) =>
  generate({
    system: ROLEPLAY_TURN_SYSTEM,
    schema: RoleplayTurnSchema,
    effort: 'low',
    user: `${learnerBlock(b.learner)}

Scene: ${b.scene}
Characters (you may only speak as these): ${b.characters.map((c) => `${c.name} (${c.vibe})`).join(', ')}
Skill the learner is practicing: ${b.skillFocus}

Conversation so far:
${b.history.map((m) => `${m.speaker}: ${m.text}`).join('\n')}

Write the characters' next replies.`,
  }),
);
