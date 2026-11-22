import type { z } from 'zod';
// @ts-ignore - plain JS by design
import { sanitizeString, sanitizePayload } from './groqSanitizer';
import { callGroqCompletion, parseModelJson } from './groqProxyClient';

/**
 * Shared low-level JSON-mode call for one-off structured generation
 * (a single recipe, a weekly meal plan) that doesn't fit the
 * conversational agent shape in agentFactory.ts. Same sanitization and
 * schema-validation guarantees: every payload passes through the Groq
 * sanitizer, and every response is validated against the caller's own
 * Zod schema before it's trusted. Returns null on any failure —
 * generation is always a nice-to-have, never something calling code
 * should have to guard against throwing.
 */
export async function callGroqJSON<T>(
  systemPrompt: string,
  userPayload: Record<string, unknown>,
  schema: z.ZodType<T>
): Promise<T | null> {
  try {
    const cleanPayload = sanitizePayload(userPayload) as Record<string, unknown>;
    const userPrompt = sanitizeString(JSON.stringify(cleanPayload));
    if (!userPrompt) return null;

    const raw = await callGroqCompletion(
      [
        { role: 'system', content: `${systemPrompt}\nRespond with ONLY valid JSON, no markdown fences, no commentary.` },
        { role: 'user', content: userPrompt },
      ],
      0.6
    );
    if (!raw) return null;

    const validated = schema.safeParse(parseModelJson(raw));
    if (!validated.success) {
      console.error('callGroqJSON: schema validation failed', validated.error.flatten());
      return null;
    }
    return validated.data;
  } catch (error) {
    console.error('callGroqJSON: request failed', error);
    return null;
  }
}
