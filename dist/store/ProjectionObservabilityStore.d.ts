import type { ProjectionObservabilityHistoryPage, ProjectionObservabilityStorageStats } from '../types/index.js';
export declare class ProjectionObservabilityStore {
    private db;
    constructor(dbPath?: string);
    private initializeSchema;
    insertSample(input: {
        projectionType: 'vector' | 'runtime' | 'policy';
        projectionName: string;
        checkpointStatus: 'idle' | 'building' | 'ready' | 'degraded' | 'failed';
        pendingEvents: number;
        materializedCount: number;
        sampledAt?: number;
        metadata?: Record<string, unknown>;
    }): void;
    deleteOlderThan(cutoffTime: number): number;
    compactOlderThan(cutoffTime: number, bucketMs?: number): {
        insertedRollups: number;
        prunedSamples: number;
    };
    compactRollupsOlderThan(cutoffTime: number, sourceBucketMs: number, targetBucketMs: number): {
        insertedRollups: number;
        prunedRollups: number;
    };
    getSampleCount(): number;
    getRollupCount(): number;
    getStorageStats(): ProjectionObservabilityStorageStats;
    getHistoryPage(page?: number, pageSize?: number, filters?: {
        projectionType?: Array<'vector' | 'runtime' | 'policy'>;
        checkpointStatus?: Array<'idle' | 'building' | 'ready' | 'degraded' | 'failed'>;
        bucketMs?: number;
        aggregateMode?: 'latest' | 'avg';
        startTime?: number;
        endTime?: number;
        includeRollups?: boolean;
    }): ProjectionObservabilityHistoryPage;
    close(): void;
}
//# sourceMappingURL=ProjectionObservabilityStore.d.ts.map