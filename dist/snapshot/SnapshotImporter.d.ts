import type { SnapshotHeader } from './SnapshotHeader.js';
export interface ImportOptions {
    overwrite?: boolean;
    dryRun?: boolean;
}
export interface ImportResult {
    header: SnapshotHeader;
    targetPath: string;
    skipped: boolean;
}
export interface SnapshotImporterOptions {
    expectedEmbeddingDimension: number;
}
export declare class SnapshotImporter {
    private readonly options;
    constructor(options: SnapshotImporterOptions);
    import(snapshotPath: string, targetDbPath: string, opts?: ImportOptions): Promise<ImportResult>;
    private readSnapshot;
}
//# sourceMappingURL=SnapshotImporter.d.ts.map