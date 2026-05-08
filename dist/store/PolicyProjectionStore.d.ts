import type { ProjectionCheckpoint } from './EventStore.js';
export declare class PolicyProjectionStore {
    private db;
    constructor(dbPath?: string);
    private initializeSchema;
    getCheckpoint(projectionName: string): ProjectionCheckpoint | null;
    upsertCheckpoint(checkpoint: ProjectionCheckpoint): void;
    getStats(projectionName: string): {
        projectionName: string;
        checkpointStatus: 'idle' | 'building' | 'ready' | 'degraded' | 'failed';
        lastEventId?: string;
        lastEventTime?: number;
        lastRebuildAt?: number;
        lastFullCount: number;
    };
    close(): void;
}
//# sourceMappingURL=PolicyProjectionStore.d.ts.map