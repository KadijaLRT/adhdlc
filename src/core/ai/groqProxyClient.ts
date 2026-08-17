/**
 * Client-side entry point for every Groq call in the app. This never
 * talks to api.groq.com directly and never holds the real API key —
 * that lives only in the Vercel serverless function at /api/groq.js.
 * See that file's header comment for why (EXPO_PUBLIC_* vars are
 * inlined into the client bundle and are not a safe place for a
 * secret key, even for a "personal use" app).
 *
 * EXPO_PUBLIC_API_BASE_URL only needs to be set for the native
 * (iOS/Android) build, where there's no same-origin server to hit a
 * relative /api path against — it should point at the deployed web
 * origin (e.g. https://your-app.vercel.app). On web, a relative path
 * against the app's own origin is correct and the env var can be left
 * unset.
 */

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || '';

export interface GroqTextContentBlock {
  type: 'text';
  text: string;
}
export interface GroqImageContentBlock {
  type: 'image_url';
  image_url: { url: string };
}

export interface GroqMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | (GroqTextContentBlock | GroqImageContentBlock)[];
}

export class GroqProxyError extends Error {}

/**
 * Sends already-sanitized messages to the /api/groq proxy and returns
 * the raw JSON-string content of the model's reply (empty string if
 * the response was empty). Callers are responsible for parsing and
 * Zod-validating that string, same as before this indirection existed.
 */
export async function callGroqCompletion(messages: GroqMessage[], temperature = 0.5): Promise<string> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/api/groq`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, temperature }),
    });
  } catch (error) {
    throw new GroqProxyError(`Could not reach the AI service: ${(error as Error)?.message || 'network error'}`);
  }

  if (!response.ok) {
    throw new GroqProxyError(`AI service responded with ${response.status}`);
  }

  const data = await response.json().catch(() => null);
  return data?.content || '';
}
