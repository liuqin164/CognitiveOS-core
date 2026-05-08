import type Database from 'bun:sqlite';
export interface StepTiming {
    stepName: string;
    durationMs: number;
    completedAt: number;
}
export declare class PipelineMetrics {
    private readonly db;
    constructor(db: Database);
    initSchema(): void;
    record(runId: string, steps: StepTiming[], totalMs: number, aborted: boolean): void;
    getPipelineP99(recentN?: number): number;
    getLastRun(): {
        completedAt: number;
        aborted: boolean;
        totalMs: number;
    } | undefined;
    getStepAverages(): Record<string, number>;
    cleanup(retentionMs?: number): void;
}
//# sourceMappingURL=PipelineMetrics.d.ts.map