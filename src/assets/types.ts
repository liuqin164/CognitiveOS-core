import type { Neuron } from '../types/index.js';

export type FileAssetIngestStatus = 'tracked' | 'indexed' | 'failed' | 'ignored';
export type FileAssetParseStatus =
  | 'not_started'
  | 'text_extracted'
  | 'requires_ocr'
  | 'requires_transcription'
  | 'unsupported'
  | 'failed';
export type FileAssetPrivacyLevel = 'local' | 'cloud_allowed' | 'ask_before_cloud';

export type FileBlockKind = 'paragraph' | 'heading' | 'table' | 'code' | 'transcript' | 'ocr' | 'metadata';

export interface FileAssetRecord {
  assetId: string;
  projectId?: string;
  filePath: string;
  originalName?: string;
  mimeType?: string;
  extension?: string;
  sizeBytes: number;
  contentHash: string;
  mtimeMs: number;
  ingestStatus: FileAssetIngestStatus;
  parseStatus: FileAssetParseStatus;
  privacyLevel: FileAssetPrivacyLevel;
  createdAt: number;
  updatedAt: number;
  lastIndexedAt?: number;
  metadata?: Record<string, unknown>;
}

export interface FileBlockRecord {
  blockId: string;
  assetId: string;
  blockIndex: number;
  kind: FileBlockKind;
  text: string;
  page?: number;
  sheetName?: string;
  rowStart?: number;
  rowEnd?: number;
  columnStart?: number;
  columnEnd?: number;
  lineStart?: number;
  lineEnd?: number;
  startMs?: number;
  endMs?: number;
  selector?: string;
  symbolName?: string;
  metadata?: Record<string, unknown>;
  createdAt: number;
}

export interface FileChunkRecord {
  chunkId: string;
  assetId: string;
  neuronId: string;
  chunkIndex: number;
  blockStartIndex: number;
  blockEndIndex: number;
  kind: FileBlockKind;
  tokenEstimate?: number;
  textHash: string;
  createdAt: number;
  metadata?: Record<string, unknown>;
}

export interface FileChunkEvidence extends FileChunkRecord {
  text: string;
  filePath: string;
  originalName?: string;
  mimeType?: string;
  page?: number;
  sheetName?: string;
  rowStart?: number;
  rowEnd?: number;
  lineStart?: number;
  lineEnd?: number;
  startMs?: number;
  endMs?: number;
}

export interface FileEvidence {
  assetId: string;
  filePath: string;
  originalName?: string;
  mimeType?: string;
  matchedChunks: Array<{
    neuronId: string;
    chunkIndex: number;
    text: string;
    kind: FileBlockKind;
    page?: number;
    sheetName?: string;
    rowStart?: number;
    rowEnd?: number;
    lineStart?: number;
    lineEnd?: number;
    startMs?: number;
    endMs?: number;
  }>;
}

export interface FileLoadProbe {
  filePath: string;
  extension?: string;
  mimeType?: string;
}

export interface FileLoadInput {
  assetId: string;
  filePath: string;
  projectId?: string;
  mimeType?: string;
}

export interface LoadedFileBlock {
  text: string;
  kind: FileBlockKind;
  page?: number;
  sheetName?: string;
  rowStart?: number;
  rowEnd?: number;
  columnStart?: number;
  columnEnd?: number;
  lineStart?: number;
  lineEnd?: number;
  startMs?: number;
  endMs?: number;
  selector?: string;
  symbolName?: string;
  metadata?: Record<string, unknown>;
}

export interface LoadedFile {
  asset: {
    assetId: string;
    filePath: string;
    originalName?: string;
    mimeType?: string;
    sizeBytes: number;
    contentHash: string;
    mtimeMs: number;
  };
  blocks: LoadedFileBlock[];
  warnings: FileLoadWarning[];
}

export interface FileLoadWarning {
  code: string;
  message: string;
  recoverable: boolean;
}

export interface FileLoader {
  id: string;
  canLoad(input: FileLoadProbe): boolean;
  load(input: FileLoadInput): Promise<LoadedFile>;
}

export interface ChunkDraft {
  text: string;
  kind: FileBlockKind;
  blockStartIndex: number;
  blockEndIndex: number;
  tokenEstimate: number;
  metadata?: Record<string, unknown>;
}

export interface FileIngestionResult {
  asset: FileAssetRecord;
  blocks: FileBlockRecord[];
  chunks: FileChunkRecord[];
  neurons: Neuron[];
  skipped: boolean;
  warnings: FileLoadWarning[];
}

