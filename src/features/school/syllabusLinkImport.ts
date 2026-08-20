/**
 * Fetches a URL and extracts readable text from the HTML — for a
 * weekly reading published on a course site, a blog, or similar.
 *
 * Real, upfront limitation: this is a plain client-side fetch() call.
 * Most real course/university sites don't set the CORS headers
 * (Access-Control-Allow-Origin) that would let a browser read the
 * response from a different origin — the request itself often
 * succeeds at the network level, but the browser blocks JavaScript
 * from reading the response body. There's no client-side workaround
 * for that without a server-side proxy this app doesn't have (adding
 * one — fetching arbitrary user-supplied URLs server-side — is its own
 * real abuse-surface decision, not something to add quietly here).
 * When a fetch is blocked this way, it surfaces as a generic network
 * error indistinguishable from the site being down, so the failure
 * message below can't be more specific than "couldn't be reached" —
 * that's an honest limitation, not a bug to chase further.
 */

export interface LinkExtractResult {
  url: string;
  title: string;
  text: string;
}

const MIN_MEANINGFUL_TEXT_LENGTH = 40;

/**
 * Deliberately not a full HTML parser (no DOMParser dependency, so
 * this works identically on web and native, where DOMParser doesn't
 * exist at all) — strips script/style blocks, converts common
 * block-level tags to line breaks so paragraphs stay separated, then
 * strips remaining tags and decodes the handful of HTML entities
 * genuinely common in real prose. Good enough for "give the AI
 * readable text," not meant to preserve exact layout or formatting.
 */
function extractTextFromHtml(html: string): string {
  let text = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/tr)\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&ndash;/g, '–')
    .replace(/&mdash;/g, '—')
    .replace(/&hellip;/g, '…')
    .replace(/&ldquo;|&rdquo;/g, '"')
    .replace(/&lsquo;|&rsquo;/g, "'")
    // Numeric entities (&#8217; and &#x2019; forms) cover everything
    // else without hardcoding every named entity that could appear —
    // named entities beyond the common set above are rare enough in
    // real prose that this is a reasonable place to stop.
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n\s*\n+/g, '\n\n')
    .trim();
  return text;
}

function extractTitle(html: string): string {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match?.[1]?.trim() || '';
}

export async function fetchAndExtractLinkText(rawUrl: string): Promise<LinkExtractResult | null> {
  const url = rawUrl.trim();
  if (!url) return null;
  if (!/^https?:\/\//i.test(url)) {
    throw new Error('INVALID_URL');
  }

  let response: Response;
  try {
    response = await fetch(url);
  } catch {
    // This is the CORS case, indistinguishable here from a genuinely
    // unreachable site or a network failure — see the module comment.
    throw new Error('COULD_NOT_REACH');
  }

  if (!response.ok) {
    throw new Error('COULD_NOT_REACH');
  }

  const html = await response.text();
  const text = extractTextFromHtml(html);
  const title = extractTitle(html);

  if (text.length < MIN_MEANINGFUL_TEXT_LENGTH) {
    throw new Error('NO_READABLE_TEXT');
  }

  return { url, title, text };
}
