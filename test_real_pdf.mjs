import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import fs from 'fs';

async function main() {
  const path = '/mnt/user-data/uploads/MIOP_531_Course_Syllabus_Part_II_2026.pdf';
  const data = new Uint8Array(fs.readFileSync(path));
  console.log('File size:', data.length, 'bytes');
  try {
    const loadingTask = pdfjsLib.getDocument({ data, useWorkerFetch: false });
    const pdf = await loadingTask.promise;
    console.log('Pages:', pdf.numPages);
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      fullText += content.items.map((item) => item.str || '').join(' ') + '\n';
    }
    console.log('Extracted text length:', fullText.trim().length);
    console.log('First 500 chars:', fullText.slice(0, 500));
  } catch (err) {
    console.error('EXTRACTION FAILED:', err);
  }
}
main();
