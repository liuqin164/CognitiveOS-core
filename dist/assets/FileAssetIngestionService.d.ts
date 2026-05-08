import type { IngestInput, Neuron } from '../types/index.js';
import { FileAssetStore } from './FileAssetStore.js';
import { FileBlockStore } from './FileBlockStore.js';
import { FileChunkStore } from './FileChunkStore.js';
import { FileChunker } from './FileChunker.js';
import { FileLoaderRegistry } from './FileLoaderRegistry.js';
import type { FileAssetPrivacyLevel, FileIngestionResult } from './types.js';
export interface FileAssetIngestionServiceDeps {
    assetStore: FileAssetStore;
    blockStore: FileBlockStore;
    chunkStore: FileChunkStore;
    ingest: (input: IngestInput) => Promise<Neuron>;
    loaderRegistry?: FileLoaderRegistry;
    chunker?: FileChunker;
}
export interface IngestFileOptions {
    projectId?: string;
    mimeType?: string;
    privacyLevel?: FileAssetPrivacyLevel;
    forceReindex?: boolean;
    tags?: string[];
}
export declare class FileAssetIngestionService {
    private readonly deps;
    private readonly loaderRegistry;
    private readonly chunker;
    constructor(deps: FileAssetIngestionServiceDeps);
    ingestFile(filePath: string, options?: IngestFileOptions): Promise<FileIngestionResult>;
    private decorateChunkText;
    private inferMimeType;
}
//# sourceMappingURL=FileAssetIngestionService.d.ts.map