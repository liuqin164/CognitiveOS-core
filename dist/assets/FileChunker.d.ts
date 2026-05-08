import type { ChunkDraft, LoadedFileBlock } from './types.js';
export declare class FileChunker {
    private readonly targetTokenEstimate;
    constructor(targetTokenEstimate?: number);
    chunk(blocks: LoadedFileBlock[]): ChunkDraft[];
    hashText(text: string): string;
    private estimateTokens;
    private mergeMetadata;
}
//# sourceMappingURL=FileChunker.d.ts.map