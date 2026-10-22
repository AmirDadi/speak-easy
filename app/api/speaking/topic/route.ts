import { generate } from '@/lib/claude';
import { learnerBlock, SPEAKING_TOPIC_SYSTEM } from '@/lib/prompts';
import { createRoute } from '@/lib/route';
import { SpeakingTopicRequestSchema, SpeakingTopicSchema } from '@/lib/schemas';

export const maxDuration = 60;

export const POST = createRoute(SpeakingTopicRequestSchema, async ({ learner, recentTopics }) =>
  generate({
    system: SPEAKING_TOPIC_SYSTEM,
    schema: SpeakingTopicSchema,
    effort: 'low',
    user: `${learnerBlock(learner)}

Recent topics to avoid: ${recentTopics.join('; ') || '(none)'}`,
  }),
);
