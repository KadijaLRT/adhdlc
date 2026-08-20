import { Platform } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';

/**
 * mammoth is imported explicitly by its browser-build path
 * (mammoth/mammoth.browser.js), not the bare package name. This
 * matters: mammoth's main build (what `import 'mammoth'` resolves to)
 * pulls in Node's `fs` module at the top of three of its own files
 * (main.js, unzip.js, docx/files.js) — a real top-level `require('fs')`
 * that runs at module-load time, not call time, so it would crash on
 * React Native/Hermes even if the function is never actually invoked.
 * mammoth's package.json has a "browser" field remapping those exact
 * files to fs-free versions, but that field is a Webpack/bundler-
 * ecosystem convention Metro doesn't apply automatically for native
 * builds (only for web) — so importing the bare package name would
 * work on web and silently crash on iOS/Android. Verified the browser
 * build's own require chain has no `fs` anywhere in it, and tested it
 * end-to-end against a real generated .docx with the exact ArrayBuffer
 * input shape used below.
 */
import * as mammoth from 'mammoth/mammoth.browser.js';

import { extractSectionFromHtml } from './sectionExtractor';

export interface DocxExtractResult {
  name: string;
  text: string;
  /** Present when a section/chapter was requested but genuinely couldn't be matched to any heading in this document — the caller can fall back to the full text above instead of silently using nothing. */
  sectionNotFound: boolean;
  matchedSection: string | null;
}

/**
 * Picks a .docx and extracts its text — the whole document, or just
 * one section if sectionLabel is given and a matching heading is
 * found (requires the document to actually use Word's heading styles;
 * a docx with no real headings has nothing for this to match against,
 * which comes back as sectionNotFound rather than a wrong guess).
 * Doesn't attempt .doc (the legacy pre-2007 binary format) — mammoth
 * only reads the modern XML-based .docx, and a .doc file would just
 * fail to parse with no useful error, so the picker itself only
 * offers .docx.
 */
export async function pickAndExtractDocxText(sectionLabel?: string | null): Promise<DocxExtractResult | null> {
  const picked = await DocumentPicker.getDocumentAsync({
    type: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    copyToCacheDirectory: true,
  });
  if (picked.canceled || !picked.assets?.[0]) return null;

  const asset = picked.assets[0];
  const name = asset.name || 'reading.docx';

  let arrayBuffer: ArrayBuffer;
  if (Platform.OS === 'web') {
    const file: File | undefined = (asset as any)?.file;
    if (!file) throw new Error('COULD_NOT_READ');
    arrayBuffer = await file.arrayBuffer();
  } else {
    const { File } = await import('expo-file-system');
    const nativeFile = new File(asset.uri);
    arrayBuffer = await nativeFile.arrayBuffer();
  }

  if (!sectionLabel) {
    const result = await mammoth.extractRawText({ arrayBuffer });
    return { name, text: (result.value || '').trim(), sectionNotFound: false, matchedSection: null };
  }

  const htmlResult = await mammoth.convertToHtml({ arrayBuffer });
  const sectionResult = extractSectionFromHtml(htmlResult.value || '', sectionLabel);
  if (sectionResult) {
    return { name, text: sectionResult.text, sectionNotFound: false, matchedSection: sectionResult.matchedHeading };
  }
  // Genuinely couldn't find it (no heading matched, or the document
  // has no real headings at all) — fall back to the full document
  // rather than returning nothing.
  const fallback = await mammoth.extractRawText({ arrayBuffer });
  return { name, text: (fallback.value || '').trim(), sectionNotFound: true, matchedSection: null };
}
