import { generate } from '@/lib/claude';
import { PLACEMENT_SYSTEM } from '@/lib/prompts';
import { createRoute } from '@/lib/route';
import { PlacementRequestSchema, PlacementSchema } from '@/lib/schemas';

export const maxDuration = 120;

export const POST = createRoute(PlacementRequestSchema, async (b) =>
  generate({
    system: PLACEMENT_SYSTEM,
    schema: PlacementSchema,
    user: `About me: ${b.selfDescription || '(not given)'}

Phrases I know: ${b.knownFromChecklist.join('; ') || '(none marked)'}
Phrases I don't know: ${b.unknownFromChecklist.join('; ') || '(none marked)'}

My answers:
${b.answers.map((a) => `Q: ${a.question}\nA: ${a.answer}`).join('\n\n')}`,
  }),
);
