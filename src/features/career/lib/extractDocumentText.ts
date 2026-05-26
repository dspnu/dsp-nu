// Client-side text extraction for PDF and DOCX files.
// PDFs use pdfjs-dist with a Vite-bundled worker; DOCX uses mammoth.
import * as pdfjs from 'pdfjs-dist';
// @ts-expect-error - Vite handles ?url for worker assets
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import mammoth from 'mammoth';

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export const MAX_DOC_BYTES = 8 * 1024 * 1024; // 8 MB
export const MAX_CHARS = 60_000; // safety cap so we don't bust model context

export type DocKind = 'pdf' | 'docx';

export function detectDocKind(file: File): DocKind | null {
  const name = file.name.toLowerCase();
  if (name.endsWith('.pdf') || file.type === 'application/pdf') return 'pdf';
  if (
    name.endsWith('.docx') ||
    file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    return 'docx';
  }
  return null;
}

async function extractPdf(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buf }).promise;
  const pageTexts: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const text = content.items
      .map((it: any) => ('str' in it ? it.str : ''))
      .join(' ')
      .replace(/[ \t]+/g, ' ')
      .trim();
    if (text) pageTexts.push(text);
  }
  return pageTexts.join('\n\n');
}

async function extractDocx(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer: buf });
  return result.value.trim();
}

export async function extractDocumentText(file: File): Promise<string> {
  if (file.size > MAX_DOC_BYTES) {
    throw new Error('File is larger than 8 MB. Try a smaller file.');
  }
  const kind = detectDocKind(file);
  if (!kind) throw new Error('Unsupported file type. Upload a PDF or DOCX.');

  const raw = kind === 'pdf' ? await extractPdf(file) : await extractDocx(file);
  const cleaned = raw.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  if (cleaned.length < 30) {
    throw new Error(
      kind === 'pdf'
        ? "Couldn't read text from this PDF — it may be image-only or scanned."
        : "This document appears to be empty.",
    );
  }
  return cleaned.length > MAX_CHARS ? cleaned.slice(0, MAX_CHARS) : cleaned;
}
