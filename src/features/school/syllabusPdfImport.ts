import { Platform } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';

// The legacy build (not the default /build entry) is the one meant for
// bundlers/environments without full native browser API support edge
// cases — matches what's actually been verified to work in this
// project's sandbox.
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

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
}

const MIN_MEANINGFUL_TEXT_LENGTH = 40;

async function extractTextFromPdfBytes(bytes: Uint8Array): Promise<string> {
  const loadingTask = pdfjsLib.getDocument({ data: bytes, useWorkerFetch: false });
  const pdf = await loadingTask.promise;
  let fullText = '';
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    // eslint-disable-next-line no-await-in-loop -- pages must be read in order to assemble text in reading order; a small syllabus PDF is a handful of pages, not worth the complexity of parallelizing
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    const pageText = content.items.map((item: any) => item.str || '').join(' ');
    fullText += `${pageText}\n`;
  }
  return fullText.trim();
}

/**
 * Picks a PDF and extracts its embedded text layer. Only works for
 * PDFs that actually have one — a scanned syllabus (a photo or scan
 * saved as PDF) has no text layer at all, which this detects
 * (looksScanned: true) rather than silently returning nothing with no
 * explanation. The caller should point someone in that situation at
 * the screenshot/photo upload path instead, which reads the page
 * visually rather than needing embedded text.
 */
export async function pickAndExtractPdfText(): Promise<PdfExtractResult | null> {
  const picked = await DocumentPicker.getDocumentAsync({
    type: ['application/pdf'],
    copyToCacheDirectory: true,
  });
  if (picked.canceled || !picked.assets?.[0]) return null;

  const asset = picked.assets[0];
  const name = asset.name || 'syllabus.pdf';

  let bytes: Uint8Array;
  if (Platform.OS === 'web') {
    const file: File | undefined = (asset as any)?.file;
    if (!file) throw new Error('COULD_NOT_READ');
    bytes = new Uint8Array(await file.arrayBuffer());
  } else {
    const { File } = await import('expo-file-system');
    const nativeFile = new File(asset.uri);
    bytes = new Uint8Array(await nativeFile.arrayBuffer());
  }

  const text = await extractTextFromPdfBytes(bytes);
  return { name, text, looksScanned: text.length < MIN_MEANINGFUL_TEXT_LENGTH };
}
