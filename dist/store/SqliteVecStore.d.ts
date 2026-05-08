import type Database from 'bun:sqlite';
import type { IVectorStore, VectorSearchResult, VectorStoreStats } from './IVectorStore.js';
export declare class SqliteVecStore implements IVectorStore {
    private readonly db;
    private readonly dimension;
    constructor(db: Database, dimension?: number);
    addVector(neuronId: string, vector: number[]): void;
    addVectors(vectors: Array<{
        id: string;
        vector: number[];
    }>): void;
    removePoint(neuronId: string): void;
    search(queryVector: number[], k?: number): VectorSearchResult[];
    getStats(): VectorStoreStats;
    getCurrentCount(): number;
    clear(): void;
    checkIntegrity(): boolean;
    rebuildIndex(neurons: Array<{
        id: string;
        vector: number[];
    }>): Promise<void>;
    private initSchema;
    private assertDimension;
}
//# sourceMappingURL=SqliteVecStore.d.ts.map