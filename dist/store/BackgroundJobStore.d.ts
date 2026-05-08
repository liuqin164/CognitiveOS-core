export interface BackgroundJobRecord {
    jobName: string;
    intervalMs: number;
    nextRunAt: number;
    lastRunAt?: number;
    lastStatus: 'idle' | 'running' | 'succeeded' | 'failed';
    lastError?: string;
    isEnabled: boolean;
    leaseOwner?: string;
    leaseExpiresAt?: number;
    metadata?: Record<string, unknown>;
    updatedAt: number;
}
export declare class BackgroundJobStore {
    private db;
    constructor(dbPath?: string);
    private initializeSchema;
    upsertJob(input: {
        jobName: string;
        intervalMs: number;
        nextRunAt?: number;
        lastRunAt?: number;
        lastStatus?: 'idle' | 'running' | 'succeeded' | 'failed';
        lastError?: string;
        isEnabled?: boolean;
        metadata?: Record<string, unknown>;
        updatedAt?: number;
    }): void;
    getJob(jobName: string): BackgroundJobRecord | null;
    listDueJobs(now?: number): BackgroundJobRecord[];
    markStarted(jobName: string, startedAt?: number): void;
    acquireLease(jobName: string, ownerId: string, now?: number, leaseMs?: number): boolean;
    renewLease(jobName: string, ownerId: string, now?: number, leaseMs?: number): boolean;
    releaseLease(jobName: string, ownerId: string): void;
    markFinished(jobName: string, input: {
        finishedAt?: number;
        nextRunAt: number;
        metadata?: Record<string, unknown>;
    }): void;
    markFailed(jobName: string, input: {
        failedAt?: number;
        error: string;
        nextRunAt?: number;
        metadata?: Record<string, unknown>;
    }): void;
    close(): void;
    private mapRow;
}
//# sourceMappingURL=BackgroundJobStore.d.ts.map