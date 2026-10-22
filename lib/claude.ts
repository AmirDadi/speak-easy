/**
 * Thin wrapper around the Anthropic SDK for structured (Zod-validated) output.
 * Server-only: the API key never reaches the browser.
 */
import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import type { z } from 'zod';
import { AI_CONFIG } from './config';

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!client) client = new Anthropic();
  return client;
}

export class AiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

type Effort = 'low' | 'medium' | 'high';

/**
 * One structured call. `schema` both constrains Claude's output and validates
 * it on the way back — we never trust the shape without the Zod pass.
 *
 * Server-side refusal fallbacks are on ("default" routing), so a rare false
 * positive from a safety classifier gets re-run on a fallback model instead of
 * failing the user's practice session.
 */
export async function generate<S extends z.ZodType>(opts: {
  system: string;
  user: string;
  schema: S;
  effort?: Effort;
  maxTokens?: number;
}): Promise<z.infer<S>> {
  let response;
  try {
    response = await getClient().beta.messages.parse({
      model: AI_CONFIG.MODEL,
      max_tokens: opts.maxTokens ?? AI_CONFIG.MAX_TOKENS,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: {
        effort: opts.effort ?? 'medium',
        format: betaZodOutputFormat(opts.schema),
      },
      system: opts.system,
      messages: [{ role: 'user', content: opts.user }],
    });
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) {
      throw new AiError('The server has an invalid ANTHROPIC_API_KEY.', 500);
    }
    if (err instanceof Anthropic.RateLimitError) {
      throw new AiError('Rate limited by the AI provider — try again in a minute.', 429);
    }
    if (err instanceof Anthropic.APIError) {
      throw new AiError(`AI request failed (${err.status ?? 'network'}).`, 502);
    }
    throw new AiError('AI response could not be parsed.', 502);
  }

  if (response.stop_reason === 'refusal') {
    throw new AiError('The AI declined this request. Try rephrasing.', 422);
  }
  if (response.stop_reason === 'max_tokens') {
    throw new AiError('The AI response was cut off. Please try again.', 502);
  }
  if (response.parsed_output == null) {
    throw new AiError('AI response did not match the expected format.', 502);
  }
  return response.parsed_output as z.infer<S>;
}
