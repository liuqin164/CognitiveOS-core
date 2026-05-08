import { createHash } from 'crypto';
import { basename, extname } from 'node:path';
import { readFileSync, statSync } from 'node:fs';
import type { FileLoadInput, FileLoadProbe, FileLoader, LoadedFile, LoadedFileBlock } from './types.js';

const TEXT_EXTENSIONS = new Set(['.txt', '.md', '.log', '.json', '.yaml', '.yml']);
const CODE_EXTENSIONS = new Set([
  '.js', '.ts', '.jsx', '.tsx', '.py', '.php', '.java', '.go', '.rs', '.rb', '.sh', '.css', '.sql'
]);

function extOf(filePath: string): string {
  return extname(filePath).toLowerCase();
}

function loadTextFile(input: FileLoadInput): { text: string; sizeBytes: number; mtimeMs: number; contentHash: string } {
  const stat = statSync(input.filePath);
  const text = readFileSync(input.filePath, 'utf8');
  return {
    text,
    sizeBytes: stat.size,
    mtimeMs: stat.mtimeMs,
    contentHash: createHash('sha256').update(text).digest('hex')
  };
}

function makeLoaded(input: FileLoadInput, blocks: LoadedFileBlock[], text: string, mimeType?: string): LoadedFile {
  const stat = statSync(input.filePath);
  return {
    asset: {
      assetId: input.assetId,
      filePath: input.filePath,
      originalName: basename(input.filePath),
      mimeType: mimeType || input.mimeType,
      sizeBytes: stat.size,
      contentHash: createHash('sha256').update(text).digest('hex'),
      mtimeMs: stat.mtimeMs
    },
    blocks,
    warnings: []
  };
}

function splitParagraphBlocks(text: string, kind: LoadedFileBlock['kind'] = 'paragraph'): LoadedFileBlock[] {
  const lines = text.split(/\r?\n/);
  const blocks: LoadedFileBlock[] = [];
  let current: string[] = [];
  let startLine = 1;
  const flush = (endLine: number) => {
    const value = current.join('\n').trim();
    if (value) {
      blocks.push({
        text: value,
        kind: value.startsWith('#') ? 'heading' : kind,
        lineStart: startLine,
        lineEnd: endLine
      });
    }
    current = [];
  };
  lines.forEach((line, index) => {
    if (!line.trim()) {
      flush(index);
      startLine = index + 2;
      return;
    }
    if (current.length === 0) startLine = index + 1;
    current.push(line);
  });
  flush(lines.length);
  return blocks.length > 0 ? blocks : [{ text, kind, lineStart: 1, lineEnd: lines.length }];
}

export class PlainTextLoader implements FileLoader {
  id = 'plain_text';

  canLoad(input: FileLoadProbe): boolean {
    return TEXT_EXTENSIONS.has(extOf(input.filePath));
  }

  async load(input: FileLoadInput): Promise<LoadedFile> {
    const { text } = loadTextFile(input);
    return makeLoaded(input, splitParagraphBlocks(text), text, input.mimeType || 'text/plain');
  }
}

export class HtmlLoader implements FileLoader {
  id = 'html';

  canLoad(input: FileLoadProbe): boolean {
    return ['.html', '.htm'].includes(extOf(input.filePath));
  }

  async load(input: FileLoadInput): Promise<LoadedFile> {
    const { text } = loadTextFile(input);
    const title = text.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/\s+/g, ' ').trim();
    const body = text
      .replace(/<script[\s\S]*?<\/script>/gi, '\n')
      .replace(/<style[\s\S]*?<\/style>/gi, '\n')
      .replace(/<\/(h[1-6]|p|div|section|article|li|tr)>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\n{3,}/g, '\n\n');
    const blocks = splitParagraphBlocks([title ? `Title: ${title}` : '', body].filter(Boolean).join('\n\n'));
    return makeLoaded(input, blocks, text, 'text/html');
  }
}

export class CsvLoader implements FileLoader {
  id = 'csv';

  canLoad(input: FileLoadProbe): boolean {
    return extOf(input.filePath) === '.csv';
  }

  async load(input: FileLoadInput): Promise<LoadedFile> {
    const { text } = loadTextFile(input);
    const rows = text.split(/\r?\n/).filter((line) => line.trim());
    const header = rows[0] || '';
    const blocks: LoadedFileBlock[] = [];
    const windowSize = 30;
    for (let start = 1; start < rows.length; start += windowSize) {
      const slice = rows.slice(start, start + windowSize);
      blocks.push({
        kind: 'table',
        text: [
          `File: ${basename(input.filePath)}`,
          'Sheet: CSV',
          `Columns: ${header}`,
          `Rows: ${start + 1}-${start + slice.length}`,
          '',
          header,
          ...slice
        ].join('\n'),
        sheetName: 'CSV',
        rowStart: start + 1,
        rowEnd: start + slice.length
      });
    }
    return makeLoaded(input, blocks.length > 0 ? blocks : splitParagraphBlocks(text, 'table'), text, 'text/csv');
  }
}

export class CodeTextLoader implements FileLoader {
  id = 'code_text';

  canLoad(input: FileLoadProbe): boolean {
    return CODE_EXTENSIONS.has(extOf(input.filePath));
  }

  async load(input: FileLoadInput): Promise<LoadedFile> {
    const { text } = loadTextFile(input);
    const lines = text.split(/\r?\n/);
    const blocks: LoadedFileBlock[] = [];
    const windowSize = 80;
    const extension = extOf(input.filePath).slice(1);
    for (let start = 0; start < lines.length; start += windowSize) {
      const slice = lines.slice(start, start + windowSize);
      const symbolLine = slice.find((line) => /\b(function|class|const|let|var|export|def|interface|type)\b/.test(line));
      blocks.push({
        kind: 'code',
        text: [
          `File: ${basename(input.filePath)}`,
          `Language: ${extension}`,
          `Lines: ${start + 1}-${start + slice.length}`,
          '',
          slice.join('\n')
        ].join('\n'),
        lineStart: start + 1,
        lineEnd: start + slice.length,
        symbolName: symbolLine?.trim().slice(0, 120),
        metadata: { language: extension }
      });
    }
    return makeLoaded(input, blocks, text, `text/x-${extension}`);
  }
}

export class DocxLoader implements FileLoader {
  id = 'docx';

  canLoad(input: FileLoadProbe): boolean {
    return extOf(input.filePath) === '.docx';
  }

  async load(input: FileLoadInput): Promise<LoadedFile> {
    const mammoth = await import('mammoth') as any;
    const result = await mammoth.extractRawText({ path: input.filePath });
    const text = String(result.value || '');
    const blocks = splitParagraphBlocks(text);
    return makeLoaded(input, blocks, readFileSync(input.filePath).toString('base64'), 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  }
}

export class XlsxLoader implements FileLoader {
  id = 'xlsx';

  canLoad(input: FileLoadProbe): boolean {
    return ['.xlsx', '.xls'].includes(extOf(input.filePath));
  }

  async load(input: FileLoadInput): Promise<LoadedFile> {
    const XLSX = await import('xlsx') as any;
    const workbook = XLSX.readFile(input.filePath);
    const blocks: LoadedFileBlock[] = [];
    for (const sheetName of workbook.SheetNames || []) {
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as unknown[][];
      if (rows.length === 0) continue;
      const header = rows[0].map((cell) => String(cell)).join(', ');
      const windowSize = 30;
      for (let start = 1; start < rows.length; start += windowSize) {
        const slice = rows.slice(start, start + windowSize);
        const textRows = slice.map((row, offset) => `${start + offset + 1} | ${row.map((cell) => String(cell)).join(' | ')}`);
        blocks.push({
          kind: 'table',
          text: [
            `Workbook: ${basename(input.filePath)}`,
            `Sheet: ${sheetName}`,
            `Columns: ${header}`,
            `Rows: ${start + 1}-${start + slice.length}`,
            '',
            ...textRows
          ].join('\n'),
          sheetName,
          rowStart: start + 1,
          rowEnd: start + slice.length,
          metadata: { columns: rows[0].map((cell) => String(cell)) }
        });
      }
    }
    const raw = readFileSync(input.filePath);
    return {
      asset: {
        assetId: input.assetId,
        filePath: input.filePath,
        originalName: basename(input.filePath),
        mimeType: extOf(input.filePath) === '.xls' ? 'application/vnd.ms-excel' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        sizeBytes: statSync(input.filePath).size,
        contentHash: createHash('sha256').update(raw).digest('hex'),
        mtimeMs: statSync(input.filePath).mtimeMs
      },
      blocks,
      warnings: []
    };
  }
}

export class PdfLoader implements FileLoader {
  id = 'pdf';

  canLoad(input: FileLoadProbe): boolean {
    return extOf(input.filePath) === '.pdf';
  }

  async load(input: FileLoadInput): Promise<LoadedFile> {
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs') as any;
    const bytes = new Uint8Array(readFileSync(input.filePath));
    const task = pdfjs.getDocument({ data: bytes, useWorkerFetch: false, isEvalSupported: false, disableFontFace: true });
    const document = await task.promise;
    const blocks: LoadedFileBlock[] = [];
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      const text = content.items.map((item: any) => String(item.str || '')).join(' ').replace(/\s+/g, ' ').trim();
      if (text) {
        blocks.push({
          kind: 'paragraph',
          text,
          page: pageNumber
        });
      }
    }
    const raw = readFileSync(input.filePath);
    return {
      asset: {
        assetId: input.assetId,
        filePath: input.filePath,
        originalName: basename(input.filePath),
        mimeType: 'application/pdf',
        sizeBytes: statSync(input.filePath).size,
        contentHash: createHash('sha256').update(raw).digest('hex'),
        mtimeMs: statSync(input.filePath).mtimeMs
      },
      blocks,
      warnings: blocks.length === 0
        ? [{ code: 'pdf_no_extractable_text', message: 'PDF has no extractable text and may require OCR.', recoverable: true }]
        : []
    };
  }
}
