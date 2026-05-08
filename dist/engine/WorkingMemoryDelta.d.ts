import type Database from 'bun:sqlite';
import type { MemoryGraph } from '../core/MemoryGraph.js';
export interface WorkingMemoryDeltaRecord {
    deltaId: string;
    projectId?: string;
    neuronId: string;
    createdAt: number;
    consumed?: boolean;
    payload?: unknown;
}
export declare class WorkingMemoryDelta {
    private readonly db;
    private readonly memoryGraph;
    constructor(db: Database, memoryGraph: MemoryGraph);
    initSchema(): void;
    append(record: WorkingMemoryDeltaRecord): void;
    markConsumed(deltaId: string): void;
    cleanup(retentionMs?: number): {
        deleted: number;
    };
    private ensureColumn;
}
//# sourceMappingURL=WorkingMemoryDelta.d.ts.map