import { createHash } from 'crypto';
import type { ChunkDraft, LoadedFileBlock } from './types.js';

export class FileChunker {
  constructor(private readonly targetTokenEstimate: number = 420) {}

  chunk(blocks: LoadedFileBlock[]): ChunkDraft[] {
    const chunks: ChunkDraft[] = [];
    let current: LoadedFileBlock[] = [];
    let currentStart = 0;
    let tokens = 0;

    const flush = (endIndex: number) => {
      if (current.length === 0) return;
      const kind = current.some((block) => block.kind === 'table')
        ? 'table'
        : current.some((block) => block.kind === 'code')
          ? 'code'
          : current[0].kind;
      chunks.push({
        text: current.map((block) => block.text).join('\n\n'),
        kind,
        blockStartIndex: currentStart,
        blockEndIndex: endIndex,
        tokenEstimate: tokens,
        metadata: this.mergeMetadata(current)
      });
      current = [];
      tokens = 0;
    };

    blocks.forEach((block, index) => {
      const blockTokens = this.estimateTokens(block.text);
      const forceOwnChunk = block.kind === 'table' || block.kind === 'code';
      if (forceOwnChunk && current.length > 0) flush(index - 1);
      if (current.length === 0) currentStart = index;
      current.push(block);
      tokens += blockTokens;
      if (forceOwnChunk || tokens >= this.targetTokenEstimate) flush(index);
    });
    flush(blocks.length - 1);
    return chunks.filter((chunk) => chunk.text.trim());
  }

  hashText(text: string): string {
    return createHash('sha256').update(text).digest('hex');
  }

  private estimateTokens(text: string): number {
    const cjk = (text.match(/[\u3400-\u9fff]/g) || []).length;
    const words = (text.match(/[A-Za-z0-9_\-.]+/g) || []).length;
    return Math.max(1, cjk + words);
  }

  private mergeMetadata(blocks: LoadedFileBlock[]): Record<string, unknown> {
    const first = blocks[0];
    const last = blocks[blocks.length - 1];
    return {
      page: first.page,
      sheetName: first.sheetName,
      rowStart: first.rowStart,
      rowEnd: last.rowEnd,
      lineStart: first.lineStart,
      lineEnd: last.lineEnd,
      startMs: first.startMs,
      endMs: last.endMs,
      symbolName: first.symbolName
    };
  }
}

