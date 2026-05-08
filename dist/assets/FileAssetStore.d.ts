import Database from 'bun:sqlite';
import type { FileAssetIngestStatus, FileAssetParseStatus, FileAssetPrivacyLevel, FileAssetRecord } from './types.js';
export interface UpsertFileAssetInput {
    assetId?: string;
    projectId?: string;
    filePath: string;
    originalName?: string;
    mimeType?: string;
    extension?: string;
    sizeBytes: number;
    contentHash: string;
    mtimeMs: number;
    ingestStatus?: FileAssetIngestStatus;
    parseStatus?: FileAssetParseStatus;
    privacyLevel?: FileAssetPrivacyLevel;
    lastIndexedAt?: number;
    metadata?: Record<string, unknown>;
}
export declare class FileAssetStore {
    private readonly db;
    constructor(db: Database);
    initSchema(): void;
    upsert(input: UpsertFileAssetInput): FileAssetRecord;
    markIndexed(assetId: string, parseStatus?: FileAssetParseStatus): FileAssetRecord | null;
    getById(assetId: string): FileAssetRecord | null;
    findByPath(filePath: string, projectId?: string): FileAssetRecord | null;
    listByQuery(input: {
        query?: string;
        projectId?: string;
        extension?: string;
        mimeType?: string;
        limit?: number;
    }): FileAssetRecord[];
    private mapRow;
}
//# sourceMappingURL=FileAssetStore.d.ts.map