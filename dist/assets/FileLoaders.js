import { createHash } from 'crypto';
import { basename, extname } from 'node:path';
import { readFileSync, statSync } from 'node:fs';
const TEXT_EXTENSIONS = new Set(['.txt', '.md', '.log', '.json', '.yaml', '.yml']);
const CODE_EXTENSIONS = new Set([
    '.js', '.ts', '.jsx', '.tsx', '.py', '.php', '.java', '.go', '.rs', '.rb', '.sh', '.css', '.sql'
]);
function extOf(filePath) {
    return extname(filePath).toLowerCase();
}
function loadTextFile(input) {
    const stat = statSync(input.filePath);
    const text = readFileSync(input.filePath, 'utf8');
    return {
        text,
        sizeBytes: stat.size,
        mtimeMs: stat.mtimeMs,
        contentHash: createHash('sha256').update(text).digest('hex')
    };
}
function makeLoaded(input, blocks, text, mimeType) {
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
function splitParagraphBlocks(text, kind = 'paragraph') {
    const lines = text.split(/\r?\n/);
    const blocks = [];
    let current = [];
    let startLine = 1;
    const flush = (endLine) => {
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
        if (current.length === 0)
            startLine = index + 1;
        current.push(line);
    });
    flush(lines.length);
    return blocks.length > 0 ? blocks : [{ text, kind, lineStart: 1, lineEnd: lines.length }];
}
export class PlainTextLoader {
    id = 'plain_text';
    canLoad(input) {
        return TEXT_EXTENSIONS.has(extOf(input.filePath));
    }
    async load(input) {
        const { text } = loadTextFile(input);
        return makeLoaded(input, splitParagraphBlocks(text), text, input.mimeType || 'text/plain');
    }
}
export class HtmlLoader {
    id = 'html';
    canLoad(input) {
        return ['.html', '.htm'].includes(extOf(input.filePath));
    }
    async load(input) {
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
export class CsvLoader {
    id = 'csv';
    canLoad(input) {
        return extOf(input.filePath) === '.csv';
    }
    async load(input) {
        const { text } = loadTextFile(input);
        const rows = text.split(/\r?\n/).filter((line) => line.trim());
        const header = rows[0] || '';
        const blocks = [];
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
export class CodeTextLoader {
    id = 'code_text';
    canLoad(input) {
        return CODE_EXTENSIONS.has(extOf(input.filePath));
    }
    async load(input) {
        const { text } = loadTextFile(input);
        const lines = text.split(/\r?\n/);
        const blocks = [];
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
export class DocxLoader {
    id = 'docx';
    canLoad(input) {
        return extOf(input.filePath) === '.docx';
    }
    async load(input) {
        const mammoth = await import('mammoth');
        const result = await mammoth.extractRawText({ path: input.filePath });
        const text = String(result.value || '');
        const blocks = splitParagraphBlocks(text);
        return makeLoaded(input, blocks, readFileSync(input.filePath).toString('base64'), 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    }
}
export class XlsxLoader {
    id = 'xlsx';
    canLoad(input) {
        return ['.xlsx', '.xls'].includes(extOf(input.filePath));
    }
    async load(input) {
        const XLSX = await import('xlsx');
        const workbook = XLSX.readFile(input.filePath);
        const blocks = [];
        for (const sheetName of workbook.SheetNames || []) {
            const sheet = workbook.Sheets[sheetName];
            const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
            if (rows.length === 0)
                continue;
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
export class PdfLoader {
    id = 'pdf';
    canLoad(input) {
        return extOf(input.filePath) === '.pdf';
    }
    async load(input) {
        const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
        const bytes = new Uint8Array(readFileSync(input.filePath));
        const task = pdfjs.getDocument({ data: bytes, useWorkerFetch: false, isEvalSupported: false, disableFontFace: true });
        const document = await task.promise;
        const blocks = [];
        for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
            const page = await document.getPage(pageNumber);
            const content = await page.getTextContent();
            const text = content.items.map((item) => String(item.str || '')).join(' ').replace(/\s+/g, ' ').trim();
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
