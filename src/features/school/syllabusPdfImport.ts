import { Platform } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';

// The legacy build (not the default /build entry) is the one meant for
// bundlers/environments without full native browser API support edge
// cases — matches what's actually been verified to work in this
// project's sandbox.
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { pickWebFile } from '@/features/settings/appleHealthImport';

// pdf.js requires an explicit worker — it throws synchronously
// ("No GlobalWorkerOptions.workerSrc specified") without one, in a
// real browser, regardless of the useWorkerFetch flag below. This was
// missed in earlier testing because a plain Node.js script has no
// browser worker model at all, so it never exercised this code path —
// only a real browser reproduction with the actual uploaded file
// caught it. pdf.worker.min.mjs is copied into public/ (see
// package.json's "postinstall"), so it's served from this app's own
// origin — no external CDN dependency, which matters since campus
// networks routinely block CDNs a student would otherwise need this
// to reach.
if (Platform.OS === 'web' && typeof window !== 'undefined') {
  (pdfjsLib as any).GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
}

export interface PdfExtractResult {
  name: string;
  text: string;
  /** True when almost no text was found — most likely a scanned/image-only PDF with no real text layer, not a parsing failure. */
  looksScanned: boolean;
  totalPages: number;
  /** Echoes back the actual (clamped) range that was read, so the caller can tell the person if it differs from what a screenshot originally said (e.g. "page 200" on a 50-page document). */
  rangeUsed: { startPage: number; endPage: number } | null;
}

const MIN_MEANINGFUL_TEXT_LENGTH = 40;

/**
 * Known limitation, tested and left as-is deliberately: PDF text items
 * come back in the underlying content stream's write order, which
 * isn't guaranteed to match visual reading order — a genuinely
 * multi-column or oddly-authored PDF can produce scrambled text. A
 * position-based reading-order reconstruction (grouping by y-position,
 * sorting left-to-right within a row) was tried and tested against
 * three real cases: it fixed a synthetic adversarial scrambled-order
 * PDF, left a simple 2-column table unchanged, but made an actual real
 * syllabus WORSE — its table has multi-line cell headers ("Due" / "Day"
 * stacked as two lines of one cell) at y-coordinates close enough to a
 * neighboring row's text that no single row-grouping tolerance is
 * correct for both cases at once. Rather than gamble a heuristic that
 * demonstrably breaks some real documents to partially fix a different
 * theoretical class of document, this keeps the simpler, predictable
 * stream-order concatenation — which, in practice, is correct for most
 * real syllabi (most are authored in standard word processors that
 * write in visual order already), and leaves paste-text/screenshot as
 * the reliable fallback for whatever it isn't.
 */
async function extractTextFromPdfBytes(bytes: Uint8Array, range?: { startPage: number; endPage: number }): Promise<{ text: string; totalPages: number }> {
  const loadingTask = pdfjsLib.getDocument({ data: bytes, useWorkerFetch: false });
  const pdf = await loadingTask.promise;
  const totalPages = pdf.numPages;
  // Real page numbers map directly onto pdf.js's own page indices —
  // unlike DOCX/EPUB, a PDF genuinely has fixed pages, so this is a
  // reliable, exact scope rather than a best-effort heuristic. Clamped
  // to the document's actual bounds in case a screenshot's page
  // numbers don't match this particular PDF (a different edition, a
  // typo, or a range that assumed front-matter pages weren't counted).
  const startPage = range ? Math.max(1, Math.min(range.startPage, totalPages)) : 1;
  const endPage = range ? Math.max(startPage, Math.min(range.endPage, totalPages)) : totalPages;

  let fullText = '';
  for (let pageNum = startPage; pageNum <= endPage; pageNum++) {
    // eslint-disable-next-line no-await-in-loop -- pages must be read in order to assemble text in reading order; a small syllabus PDF is a handful of pages, not worth the complexity of parallelizing
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    const pageText = content.items.map((item: any) => item.str || '').join(' ');
    fullText += `${pageText}\n`;
  }
  return { text: fullText.trim(), totalPages };
}

/**
 * Picks a PDF and extracts its embedded text layer. Only works for
 * PDFs that actually have one — a scanned syllabus (a photo or scan
 * saved as PDF) has no text layer at all, which this detects
 * (looksScanned: true) rather than silently returning nothing with no
 * explanation. The caller should point someone in that situation at
 * the screenshot/photo upload path instead, which reads the page
 * visually rather than needing embedded text.
 *
 * On native (iOS/Android), the picker's own `type` filter is
 * deliberately left as the wildcard (matches every file), not narrowed
 * to "application/pdf" — expo-document-picker's native type matching is
 * meant to work via UTIs, not raw MIME strings, and there's a real,
 * open, unresolved Expo GitHub issue (expo/expo#29403) confirming a
 * specific type like this can fail to match real files on iOS with no
 * workaround short of a custom UTI plugin config this app doesn't
 * have. Rather than fight that documented native bug (which is what
 * caused files to appear greyed out/unselectable — see the
 * conversation this was fixed from), every file is shown, and the
 * actual extension is validated in app code afterward (NOT_PDF below)
 * instead of relying on a native filter mechanism that doesn't reliably
 * work.
 */
export async function pickAndExtractPdfText(range?: { startPage: number; endPage: number }): Promise<PdfExtractResult | null> {
  let bytes: Uint8Array;
  let name: string;

  if (Platform.OS === 'web') {
    // Same fix as syllabusEpubImport.ts — expo-document-picker's web
    // implementation reads the whole file into memory as base64
    // before returning, wasted work for a large PDF this only ever
    // reads via the raw File below.
    const file = await pickWebFile('.pdf');
    if (!file) return null;
    name = file.name || 'syllabus.pdf';
    bytes = new Uint8Array(await file.arrayBuffer());
  } else {
    const picked = await DocumentPicker.getDocumentAsync({
      type: '*/*',
      copyToCacheDirectory: true,
    });
    if (picked.canceled || !picked.assets?.[0]) return null;
    const asset = picked.assets[0];
    name = asset.name || 'syllabus.pdf';
    if (!name.toLowerCase().endsWith('.pdf')) {
      throw new Error('NOT_PDF');
    }
    const { File } = await import('expo-file-system');
    const nativeFile = new File(asset.uri);
    bytes = new Uint8Array(await nativeFile.arrayBuffer());
  }

  const { text, totalPages } = await extractTextFromPdfBytes(bytes, range);
  const rangeUsed = range
    ? { startPage: Math.max(1, Math.min(range.startPage, totalPages)), endPage: Math.max(1, Math.min(range.endPage, totalPages)) }
    : null;
  return { name, text, looksScanned: text.length < MIN_MEANINGFUL_TEXT_LENGTH, totalPages, rangeUsed };
}
