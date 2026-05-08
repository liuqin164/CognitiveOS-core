import Database from 'bun:sqlite';
import type { FileBlockRecord, LoadedFileBlock } from './types.js';
export declare class FileBlockStore {
    private readonly db;
    constructor(db: Database);
    initSchema(): void;
    replaceBlocks(assetId: string, blocks: LoadedFileBlock[]): FileBlockRecord[];
    listByAsset(assetId: string): FileBlockRecord[];
    listRange(assetId: string, startIndex: number, endIndex: number): FileBlockRecord[];
    private mapRow;
}
//# sourceMappingURL=FileBlockStore.d.ts.map