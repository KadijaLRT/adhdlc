import { Platform } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';

/**
 * EPUB is a zip archive of XHTML files plus an OPF manifest describing
 * reading order — no dedicated library was added for this (epubjs, the
 * most maintained option on npm, is built for rendering a book in a
 * reader UI, not extracting plain text — the wrong tool for this).
 * Instead this parses the real EPUB structure directly with jszip,
 * already a verified dependency in this project (used for Apple
 * Health import). Tested end-to-end against a real generated EPUB
 * (python's ebooklib) — including catching a real bug during that
 * testing: the EPUB3 navigation document (table of contents) has an
 * html media-type just like real chapters do, and its links leaked
 * into extracted text before explicitly excluding it via its
 * `properties="nav"` manifest marker.
 */
import JSZip from 'jszip';

import { extractSectionFromHtml } from './sectionExtractor';
import { pickWebFile } from '@/features/settings/appleHealthImport';

export interface EpubExtractResult {
  name: string;
  title: string;
  text: string;
  /** Present when a section/chapter was requested but genuinely couldn't be matched to anything in this EPUB — the caller can fall back to the full text above instead of silently using nothing. */
  sectionNotFound: boolean;
  matchedSection: string | null;
}

interface ManifestItem {
  href: string;
  mediaType: string;
  properties: string;
}

function extractAttr(tagAttrs: string, name: string): string {
  const match = tagAttrs.match(new RegExp(`${name}="([^"]*)"`));
  return match?.[1] || '';
}

/** Same approach as syllabusLinkImport.ts's HTML stripping — deliberately not a DOM parser, so this works identically on web and native. */
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

async function extractEpubText(zip: JSZip, sectionLabel?: string | null): Promise<{ title: string; text: string; sectionNotFound: boolean; matchedSection: string | null }> {
  const containerFile = zip.file('META-INF/container.xml');
  if (!containerFile) throw new Error('NOT_A_VALID_EPUB');
  const containerXml = await containerFile.async('string');
  const opfPath = containerXml.match(/full-path="([^"]+)"/)?.[1];
  if (!opfPath) throw new Error('NOT_A_VALID_EPUB');

  const opfFile = zip.file(opfPath);
  if (!opfFile) throw new Error('NOT_A_VALID_EPUB');
  const opfXml = await opfFile.async('string');
  const opfDir = opfPath.includes('/') ? opfPath.slice(0, opfPath.lastIndexOf('/') + 1) : '';

  const title = opfXml.match(/<dc:title[^>]*>([\s\S]*?)<\/dc:title>/i)?.[1]?.trim() || '';

  const manifest: Record<string, ManifestItem> = {};
  const itemRe = /<item\s+([^>]*?)\/?>/g;
  let match: RegExpExecArray | null;
  while ((match = itemRe.exec(opfXml))) {
    const attrs = match[1] || '';
    const id = extractAttr(attrs, 'id');
    const href = extractAttr(attrs, 'href');
    if (id && href) {
      manifest[id] = { href, mediaType: extractAttr(attrs, 'media-type'), properties: extractAttr(attrs, 'properties') };
    }
  }

  const spineIds: string[] = [];
  const spineRe = /<itemref\s+[^>]*idref="([^"]+)"/g;
  while ((match = spineRe.exec(opfXml))) {
    if (match[1]) spineIds.push(match[1]);
  }

  // Also read the EPUB3 nav document's own table-of-contents links —
  // these give each chapter file a real human-readable title (e.g.
  // "Chapter 6: Recursion") even when the chapter's own internal HTML
  // has no heading tag at all, which is common. Used below as the
  // fallback match target when a section label doesn't match anything
  // inside a chapter's actual content.
  const navItem = Object.values(manifest).find((item) => item.properties.includes('nav'));
  const chapterTitlesByHref: Record<string, string> = {};
  if (navItem) {
    const navFile = zip.file(opfDir + navItem.href);
    if (navFile) {
      const navHtml = await navFile.async('string');
      const linkRe = /<a[^>]*href="([^"#]+)[^"]*"[^>]*>([\s\S]*?)<\/a>/gi;
      let linkMatch: RegExpExecArray | null;
      while ((linkMatch = linkRe.exec(navHtml))) {
        const href = linkMatch[1];
        const text = (linkMatch[2] || '').replace(/<[^>]+>/g, '').trim();
        if (href && text) chapterTitlesByHref[href] = text;
      }
    }
  }

  // Build one combined HTML document — each chapter wrapped in its own
  // heading using its nav-derived title (or manifest id as a last
  // resort), so extractSectionFromHtml can search across the WHOLE
  // book by heading, not just isolated per-chapter blobs with no
  // structure to search against. A chapter's own real internal
  // headings (if any) stay inside its section, so a section label
  // that matches an internal heading still works too.
  let combinedHtml = '';
  const chapterBoundaries: { title: string; href: string }[] = [];
  for (const id of spineIds) {
    const item = manifest[id];
    if (!item || !item.mediaType.includes('html') || item.properties.includes('nav')) continue;
    const fullPath = opfDir + item.href;
    const chapterFile = zip.file(fullPath);
    if (!chapterFile) continue;
    const chapterTitle = chapterTitlesByHref[item.href] || id;
    chapterBoundaries.push({ title: chapterTitle, href: item.href });
    // eslint-disable-next-line no-await-in-loop -- chapters must be read in spine order to assemble text in reading order
    const html = await chapterFile.async('string');
    combinedHtml += `<h1>${chapterTitle}</h1>${html}`;
  }

  if (!sectionLabel) {
    return { title, text: extractTextFromHtml(combinedHtml), sectionNotFound: false, matchedSection: null };
  }

  const sectionResult = extractSectionFromHtml(combinedHtml, sectionLabel);
  if (sectionResult) {
    return { title, text: sectionResult.text, sectionNotFound: false, matchedSection: sectionResult.matchedHeading };
  }
  // Genuinely couldn't find it — the caller decides whether to fall
  // back to the full book rather than silently returning nothing.
  return { title, text: extractTextFromHtml(combinedHtml), sectionNotFound: true, matchedSection: null };
}

export async function pickAndExtractEpubText(sectionLabel?: string | null): Promise<EpubExtractResult | null> {
  let arrayBuffer: ArrayBuffer;
  let name: string;

  if (Platform.OS === 'web') {
    // expo-document-picker's own web implementation unconditionally
    // reads the whole file into memory as a base64 data URL before
    // ever returning — real, wasted memory pressure for a large file
    // that's never even used (this always reads via asset.file
    // directly below). Same fix already proven for Apple Health
    // imports (see pickWebFile's own comment there).
    const file = await pickWebFile('application/epub+zip,.epub');
    if (!file) return null;
    name = file.name || 'reading.epub';
    arrayBuffer = await file.arrayBuffer();
  } else {
    const picked = await DocumentPicker.getDocumentAsync({
      type: ['application/epub+zip', '.epub'],
      copyToCacheDirectory: true,
    });
    if (picked.canceled || !picked.assets?.[0]) return null;
    const asset = picked.assets[0];
    name = asset.name || 'reading.epub';
    const { File } = await import('expo-file-system');
    const nativeFile = new File(asset.uri);
    arrayBuffer = await nativeFile.arrayBuffer();
  }

  const zip = await JSZip.loadAsync(arrayBuffer);
  const { title, text, sectionNotFound, matchedSection } = await extractEpubText(zip, sectionLabel);
  return { name, title, text, sectionNotFound, matchedSection };
}
