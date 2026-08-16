import { Platform } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';

/**
 * Reads a plain-text file the person picks. Deliberately .txt-only —
 * PDF and Word syllabi are extremely common in practice, but parsing
 * those client-side reliably (real-world PDFs are frequently scanned
 * images, multi-column, or have broken text layers) isn't something
 * this can verify actually works across the range of files a real
 * syllabus arrives in. Rather than ship a parser that silently mangles
 * some PDFs and not others, this asks the person to paste the text
 * instead for anything that isn't already a .txt file — copy-paste
 * from a PDF viewer or Word is reliable in a way a client-side PDF
 * parser wouldn't be.
 *
 * A syllabus text file is small (KB, not MB), so this doesn't need the
 * same web-crash-avoidance bypass appleHealthImport.ts uses for
 * multi-GB Apple Health exports — expo-document-picker's web
 * implementation (which reads via FileReader.readAsDataURL) is fine at
 * this size.
 */
export async function pickAndReadTextFile(): Promise<{ name: string; text: string } | null> {
  const picked = await DocumentPicker.getDocumentAsync({
    type: ['text/plain', '*/*'],
    copyToCacheDirectory: true,
  });
  if (picked.canceled || !picked.assets?.[0]) return null;

  const asset = picked.assets[0];
  const name = asset.name || 'syllabus.txt';
  if (!name.toLowerCase().endsWith('.txt')) {
    throw new Error('NOT_TXT');
  }

  if (Platform.OS === 'web') {
    const file: File | undefined = (asset as any)?.file;
    if (!file) throw new Error('COULD_NOT_READ');
    const text = await file.text();
    return { name, text };
  }

  const { File } = await import('expo-file-system');
  const file = new File(asset.uri);
  const text = await file.text();
  return { name, text };
}
