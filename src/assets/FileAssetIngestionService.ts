import { createHash, randomUUID } from 'crypto';
import { basename, extname } from 'node:path';
import { readFileSync, statSync } from 'node:fs';
import type { IngestInput, Neuron } from '../types/index.js';
import { FileAssetStore } from './FileAssetStore.js';
import { FileBlockStore } from './FileBlockStore.js';
import { FileChunkStore, type InsertChunkInput } from './FileChunkStore.js';
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

export class FileAssetIngestionService {
  private readonly loaderRegistry: FileLoaderRegistry;
  private readonly chunker: FileChunker;

  constructor(private readonly deps: FileAssetIngestionServiceDeps) {
    this.loaderRegistry = deps.loaderRegistry || new FileLoaderRegistry();
    this.chunker = deps.chunker || new FileChunker();
  }

  async ingestFile(filePath: string, options: IngestFileOptions = {}): Promise<FileIngestionResult> {
    const stat = statSync(filePath);
    const content = readFileSync(filePath);
    const extension = extname(filePath).toLowerCase();
    const contentHash = createHash('sha256').update(content).digest('hex');
    const existing = this.deps.assetStore.findByPath(filePath, options.projectId);
    const asset = this.deps.assetStore.upsert({
      assetId: existing?.assetId,
      projectId: options.projectId,
      filePath,
      originalName: basename(filePath),
      mimeType: options.mimeType || this.inferMimeType(extension),
      extension,
      sizeBytes: stat.size,
      contentHash,
      mtimeMs: stat.mtimeMs,
      ingestStatus: 'tracked',
      parseStatus: 'not_started',
      privacyLevel: options.privacyLevel || existing?.privacyLevel || 'local'
    });

    if (existing && !options.forceReindex && existing.contentHash === contentHash && existing.ingestStatus === 'indexed') {
      return {
        asset,
        blocks: this.deps.blockStore.listByAsset(asset.assetId),
        chunks: this.deps.chunkStore.listByAsset(asset.assetId),
        neurons: [],
        skipped: true,
        warnings: []
      };
    }

    const loader = this.loaderRegistry.resolve({ filePath, extension, mimeType: asset.mimeType });
    if (!loader) {
      const failed = this.deps.assetStore.upsert({
        ...asset,
        ingestStatus: 'failed',
        parseStatus: 'unsupported'
      });
      return {
        asset: failed,
        blocks: [],
        chunks: [],
        neurons: [],
        skipped: false,
        warnings: [{ code: 'unsupported_file_type', message: `No loader for ${extension || filePath}`, recoverable: true }]
      };
    }

    const loaded = await loader.load({
      assetId: asset.assetId,
      filePath,
      projectId: options.projectId,
      mimeType: asset.mimeType
    });
    const blocks = this.deps.blockStore.replaceBlocks(asset.assetId, loaded.blocks);
    const drafts = this.chunker.chunk(loaded.blocks);
    const neurons: Neuron[] = [];
    const chunkInputs: InsertChunkInput[] = [];
    for (let i = 0; i < drafts.length; i += 1) {
      const draft = drafts[i];
      const neuron = await this.deps.ingest({
        type: 'doc',
        content: this.decorateChunkText(asset.filePath, draft.text, draft.metadata),
        filePath: asset.filePath,
        projectId: options.projectId,
        sourceType: 'external_tool',
        tags: [
          'namespace:file_asset',
          `asset:${asset.assetId}`,
          `source_kind:${draft.kind}`,
          ...(options.tags || [])
        ]
      });
      neurons.push(neuron);
      chunkInputs.push({
        ...draft,
        chunkId: `chunk-${randomUUID()}`,
        assetId: asset.assetId,
        neuronId: neuron.id,
        chunkIndex: i,
        textHash: this.chunker.hashText(draft.text)
      });
    }
    const chunks = this.deps.chunkStore.replaceChunks(asset.assetId, chunkInputs);
    const indexed = this.deps.assetStore.markIndexed(asset.assetId, 'text_extracted') || asset;
    return {
      asset: indexed,
      blocks,
      chunks,
      neurons,
      skipped: false,
      warnings: loaded.warnings
    };
  }

  private decorateChunkText(filePath: string, text: string, metadata?: Record<string, unknown>): string {
    const lines = [`Source: ${filePath}`];
    if (metadata?.page) lines.push(`Page: ${metadata.page}`);
    if (metadata?.sheetName) lines.push(`Sheet: ${metadata.sheetName}`);
    if (metadata?.rowStart || metadata?.rowEnd) lines.push(`Rows: ${metadata.rowStart || ''}-${metadata.rowEnd || ''}`);
    if (metadata?.lineStart || metadata?.lineEnd) lines.push(`Lines: ${metadata.lineStart || ''}-${metadata.lineEnd || ''}`);
    return `${lines.join('\n')}\n\n${text}`;
  }

  private inferMimeType(extension: string): string {
    const table: Record<string, string> = {
      '.txt': 'text/plain',
      '.md': 'text/markdown',
      '.log': 'text/plain',
      '.csv': 'text/csv',
      '.json': 'application/json',
      '.yaml': 'application/yaml',
      '.yml': 'application/yaml',
      '.html': 'text/html',
      '.htm': 'text/html'
    };
    return table[extension] || (extension ? `text/x-${extension.slice(1)}` : 'application/octet-stream');
  }
}

