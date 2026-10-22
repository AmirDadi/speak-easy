import { describe, expect, it } from 'vitest';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import * as S from '@/lib/schemas';

// Every schema we hand to Claude must convert to a valid structured-output format.
const OUTPUT_SCHEMAS = {
  ShadowingSchema: S.ShadowingSchema,
  VocabPromptsSchema: S.VocabPromptsSchema,
  VocabGradeSchema: S.VocabGradeSchema,
  SpeakingTopicSchema: S.SpeakingTopicSchema,
  SpeakingReportSchema: S.SpeakingReportSchema,
  RoleplayStartSchema: S.RoleplayStartSchema,
  RoleplayTurnSchema: S.RoleplayTurnSchema,
  RoleplayFeedbackSchema: S.RoleplayFeedbackSchema,
  PlacementSchema: S.PlacementSchema,
  ImportSchema: S.ImportSchema,
};

describe('structured output schemas', () => {
  for (const [name, schema] of Object.entries(OUTPUT_SCHEMAS)) {
    it(`${name} converts to an output format`, () => {
      const fmt = betaZodOutputFormat(schema) as unknown as { type: string; schema: Record<string, unknown> };
      expect(fmt.type).toBe('json_schema');
      expect(fmt.schema.type).toBe('object');
    });
  }

  it('parses a valid grade and rejects an out-of-range score', () => {
    const ok = { score: 4, usedCorrectly: true, feedback: 'x', nativeVersion: 'y', grammarFixes: [] };
    expect(S.VocabGradeSchema.safeParse(ok).success).toBe(true);
    expect(S.VocabGradeSchema.safeParse({ ...ok, score: 9 }).success).toBe(false);
  });
});
