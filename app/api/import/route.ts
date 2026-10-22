import { generate } from '@/lib/claude';
import { IMPORT_SYSTEM, learnerBlock } from '@/lib/prompts';
import { createRoute } from '@/lib/route';
import { ImportRequestSchema, ImportSchema } from '@/lib/schemas';

export const maxDuration = 120;

export const POST = createRoute(ImportRequestSchema, async ({ learner, text }) =>
  generate({
    system: IMPORT_SYSTEM,
    schema: ImportSchema,
    user: `${learnerBlock(learner)}

Pasted text:
<pasted>${text}</pasted>`,
  }),
);
