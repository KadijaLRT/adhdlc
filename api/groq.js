/**
 * Vercel serverless function — the ONLY place the real Groq API key
 * ever lives. Every client-side Groq call (AvivaBrain, agentFactory,
 * simpleGroqCall) now hits this endpoint instead of instantiating the
 * OpenAI SDK directly with `dangerouslyAllowBrowser: true`.
 *
 * Why this exists: Expo inlines every EXPO_PUBLIC_* env var verbatim
 * into the web (and native) bundle at build time. A key referenced as
 * `process.env.EXPO_PUBLIC_AI_API_KEY` from client code is trivially
 * recoverable from the deployed bundle via view-source or a decompiled
 * app binary. `GROQ_API_KEY` here deliberately has no EXPO_PUBLIC_
 * prefix — Expo's bundler never touches it, and Vercel only exposes it
 * to this server-side function at request time.
 *
 * Plain CommonJS/Node handler (no @vercel/node types needed) so Vercel
 * picks it up as a Serverless Function purely from its location under
 * /api, independent of the static `expo export -p web` build output.
 */

const GROQ_BASE_URL = process.env.AI_BASE_URL || 'https://api.groq.com/openai/v1';
const DEFAULT_MODEL = process.env.AI_MODEL || 'llama-3.3-70b-versatile';
// Verified against Groq's own vision docs (console.groq.com/docs/vision)
// at the time this was added — qwen/qwen3.6-27b is Groq's current
// multimodal model, using the same OpenAI-compatible image_url content
// block shape as every other vision API. Hardcoded rather than
// client-suppliable: the client picks between "text" and "vision" via
// a boolean, never a raw model string, so this endpoint can't be used
// to route to an arbitrary/expensive model this app doesn't intend to pay for.
const VISION_MODEL = process.env.AI_VISION_MODEL || 'qwen/qwen3.6-27b';
const GROQ_API_KEY = process.env.GROQ_API_KEY;

// Defensive caps — this endpoint is public (any client can call it), so
// it validates shape and size itself rather than trusting the caller's
// own sanitizer, even though every legitimate caller already sanitizes
// before it gets here.
const MAX_MESSAGES = 10;
const MAX_TEXT_CONTENT_LENGTH = 8000;
// A base64-encoded photo is routinely a few MB — this is the only
// content type allowed to exceed MAX_TEXT_CONTENT_LENGTH, and even
// this is capped well below Groq's own upstream limit so an oversized
// request fails fast here with a clear reason rather than opaquely at
// Groq.
const MAX_IMAGE_DATA_URL_LENGTH = 7_000_000; // ~5MB of actual image data after base64's ~33% overhead
const ALLOWED_ROLES = new Set(['system', 'user', 'assistant']);

function isValidTextContent(content) {
  return typeof content === 'string' && content.length > 0 && content.length <= MAX_TEXT_CONTENT_LENGTH;
}

function isValidContentBlock(block) {
  if (!block || typeof block !== 'object') return false;
  if (block.type === 'text') {
    return isValidTextContent(block.text);
  }
  if (block.type === 'image_url') {
    const url = block.image_url && block.image_url.url;
    return (
      typeof url === 'string' &&
      url.length > 0 &&
      url.length <= MAX_IMAGE_DATA_URL_LENGTH &&
      // Only a data URL or https URL — anything else (file://, javascript:, etc.) is rejected outright.
      (url.startsWith('data:image/') || url.startsWith('https://'))
    );
  }
  return false;
}

function isValidMessages(messages) {
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > MAX_MESSAGES) return false;
  return messages.every((m) => {
    if (!m || typeof m !== 'object' || !ALLOWED_ROLES.has(m.role)) return false;
    if (isValidTextContent(m.content)) return true;
    if (Array.isArray(m.content) && m.content.length > 0) {
      return m.content.every(isValidContentBlock);
    }
    return false;
  });
}

function messagesContainImage(messages) {
  return messages.some((m) => Array.isArray(m.content) && m.content.some((b) => b.type === 'image_url'));
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  if (!GROQ_API_KEY) {
    console.error('api/groq: GROQ_API_KEY is not set in the deployment environment.');
    res.status(500).json({ error: 'AI service is not configured.' });
    return;
  }

  const body = req.body || {};
  const { messages, temperature } = body;

  if (!isValidMessages(messages)) {
    res.status(400).json({ error: 'Invalid or missing messages payload.' });
    return;
  }

  const safeTemperature = typeof temperature === 'number' && temperature >= 0 && temperature <= 2 ? temperature : 0.5;
  const model = messagesContainImage(messages) ? VISION_MODEL : DEFAULT_MODEL;

  try {
    const groqResponse = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: safeTemperature,
        response_format: { type: 'json_object' },
      }),
    });

    if (!groqResponse.ok) {
      const errText = await groqResponse.text().catch(() => '');
      console.error('api/groq: upstream Groq error', groqResponse.status, errText);
      res.status(502).json({ error: 'AI service is temporarily unavailable.' });
      return;
    }

    const data = await groqResponse.json();
    const content = data?.choices?.[0]?.message?.content || '';
    res.status(200).json({ content });
  } catch (error) {
    console.error('api/groq: request failed', error);
    res.status(502).json({ error: 'AI service is temporarily unavailable.' });
  }
};
