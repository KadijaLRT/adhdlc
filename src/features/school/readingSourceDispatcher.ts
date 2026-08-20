import type { ReadingListItem } from '@/core/ai/AvivaBrain';
import { pickAndExtractPdfText } from './syllabusPdfImport';
import { pickAndExtractDocxText } from './syllabusDocxImport';
import { pickAndExtractEpubText } from './syllabusEpubImport';
import { pickAndReadTextFile } from './syllabusImport';

export type ReadingSourceKind = 'pdf' | 'docx' | 'epub' | 'txt';

export interface ReadingSourceResult {
  name: string;
  text: string;
  /**
   * How the scope was actually resolved, for showing the person an
   * honest status rather than silently either applying or ignoring
   * the identified range:
   * - 'scoped': the requested page range or section was found and used.
   * - 'not_found': a range/section was requested but couldn't be
   *   located in this file — the full document was used instead.
   * - 'whole_document': no range was requested (item had no
   *   page/section info), or this format has no scoping concept at
   *   all (.txt) — the full extracted text was used, which is the
   *   correct behavior, not a fallback from a failure.
   */
  scopeStatus: 'scoped' | 'not_found' | 'whole_document';
  /** Human-readable description of what was actually used, e.g. "pages 120–145" or "Chapter 6: Recursion" — null when scopeStatus isn't 'scoped'. */
  scopeDescription: string | null;
}

function hasRequestedRange(item: ReadingListItem | null): boolean {
  if (!item) return false;
  return item.startPage !== null || item.endPage !== null || !!item.sectionLabel;
}

/**
 * Dispatches to the right extractor for a given file type, applying
 * whatever scope a reading-list item identified (page range for PDF,
 * section label for DOCX/EPUB) — or the whole document when the item
 * didn't specify one, or the format has no scoping concept at all.
 * Every path converges on the same ReadingSourceResult shape so the
 * calling UI doesn't need format-specific branching to show what
 * actually happened. Links aren't handled here — they're fetched by
 * URL, not picked as a file, so CourseDetailScreen.tsx calls
 * fetchAndExtractLinkText directly for that path.
 */
export async function pickAndExtractReadingSource(
  kind: ReadingSourceKind,
  item: ReadingListItem | null
): Promise<ReadingSourceResult | null> {
  const requestedRange = hasRequestedRange(item);

  if (kind === 'pdf') {
    const hasPageRange = item?.startPage != null && item?.endPage != null;
    const range = hasPageRange ? { startPage: item!.startPage as number, endPage: item!.endPage as number } : undefined;
    const picked = await pickAndExtractPdfText(range);
    if (!picked) return null;
    if (picked.looksScanned) throw new Error('LOOKS_SCANNED');

    if (range && picked.rangeUsed) {
      const { startPage, endPage } = picked.rangeUsed;
      const clampedToDifferentRange = startPage !== range.startPage || endPage !== range.endPage;
      return {
        name: picked.name,
        text: picked.text,
        scopeStatus: 'scoped',
        scopeDescription: clampedToDifferentRange
          ? `pages ${startPage}–${endPage} (requested ${range.startPage}–${range.endPage}, clamped to this document's actual ${picked.totalPages} pages)`
          : `pages ${startPage}–${endPage}`,
      };
    }
    // A section label (not page numbers) was requested for a PDF —
    // PDFs don't have real navigable headings the way DOCX/EPUB do
    // (pdf.js's text extraction here doesn't track font size/style to
    // infer heading structure), so a chapter *name* genuinely can't be
    // scoped for this format — only page numbers can. The whole
    // document is used, honestly reported as such rather than
    // pretending a section match was attempted.
    return {
      name: picked.name,
      text: picked.text,
      scopeStatus: requestedRange ? 'not_found' : 'whole_document',
      scopeDescription: null,
    };
  }

  if (kind === 'docx') {
    const picked = await pickAndExtractDocxText(item?.sectionLabel ?? null);
    if (!picked) return null;
    if (!picked.text) throw new Error('NO_TEXT');
    if (item?.sectionLabel) {
      return {
        name: picked.name,
        text: picked.text,
        scopeStatus: picked.sectionNotFound ? 'not_found' : 'scoped',
        scopeDescription: picked.matchedSection ? `"${picked.matchedSection}"` : null,
      };
    }
    return { name: picked.name, text: picked.text, scopeStatus: 'whole_document', scopeDescription: null };
  }

  if (kind === 'epub') {
    const picked = await pickAndExtractEpubText(item?.sectionLabel ?? null);
    if (!picked) return null;
    if (!picked.text) throw new Error('NO_TEXT');
    if (item?.sectionLabel) {
      return {
        name: picked.title || picked.name,
        text: picked.text,
        scopeStatus: picked.sectionNotFound ? 'not_found' : 'scoped',
        scopeDescription: picked.matchedSection ? `"${picked.matchedSection}"` : null,
      };
    }
    return { name: picked.title || picked.name, text: picked.text, scopeStatus: 'whole_document', scopeDescription: null };
  }

  // .txt: plain text has no headings or page numbers at all — nothing
  // to scope against, so a requested range (if any) is honestly
  // reported as unusable for this format rather than silently ignored
  // with no explanation.
  const picked = await pickAndReadTextFile();
  if (!picked) return null;
  return { name: picked.name, text: picked.text, scopeStatus: requestedRange ? 'not_found' : 'whole_document', scopeDescription: null };
}
