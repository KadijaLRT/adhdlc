/**
 * Shared by DOCX and EPUB section-scoping: given HTML with real
 * heading tags, finds the one whose text fuzzy-matches a requested
 * label and extracts everything from that heading up to the next
 * heading at the same or shallower level (so a sub-heading nested
 * inside the matched section stays included, but a sibling or later
 * top-level chapter doesn't). Tested against real mammoth-generated
 * HTML with genuine chapter headings — correctly scoped to just the
 * matched chapter, correctly returns null when no heading matches
 * rather than guessing.
 */

export interface SectionExtractResult {
  matchedHeading: string;
  text: string;
}

function headingMatches(headingText: string, label: string): boolean {
  const h = headingText.toLowerCase().trim();
  const l = label.toLowerCase().trim();
  if (!h || !l) return false;
  return h.includes(l) || l.includes(h);
}

/** Same tag-stripping approach used across every other reading-import file — no DOM parser, works identically on web and native. */
function extractTextFromHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6])\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n\s*\n+/g, '\n\n')
    .trim();
}

export function extractSectionFromHtml(html: string, sectionLabel: string): SectionExtractResult | null {
  const headingRe = /<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi;
  const headings: { level: number; text: string; index: number }[] = [];
  let match: RegExpExecArray | null;
  while ((match = headingRe.exec(html))) {
    const level = Number(match[1]);
    const rawText = match[2] || '';
    if (Number.isNaN(level)) continue;
    headings.push({ level, text: rawText.replace(/<[^>]+>/g, '').trim(), index: match.index });
  }

  const matchIdx = headings.findIndex((h) => headingMatches(h.text, sectionLabel));
  if (matchIdx === -1) return null;

  const startHeading = headings[matchIdx];
  if (!startHeading) return null;
  const contentStart = startHeading.index;
  const nextHeading = headings.slice(matchIdx + 1).find((h) => h.level <= startHeading.level);
  const contentEnd = nextHeading ? nextHeading.index : html.length;

  return { matchedHeading: startHeading.text, text: extractTextFromHtml(html.slice(contentStart, contentEnd)) };
}
