import type { DeepWriteCandidateRecord } from '../store/DeepWriteCandidateStore.js';
import type { DeepWriteCandidateStore } from '../store/DeepWriteCandidateStore.js';
import type { DreamBacklogStatus, DreamLedgerStore } from '../store/DreamLedgerStore.js';
import type { EventStore } from '../store/EventStore.js';
export interface DreamCuratorRunOptions {
    projectId?: string;
    limit?: number;
    mode?: 'candidate' | 'shadow';
    now?: number;
}
export interface DreamCuratorRunResult {
    runId?: string;
    projectId?: string;
    skipped: boolean;
    reason?: string;
    processedEventCount: number;
    dreamableEventCount: number;
    candidateCount: number;
    maxGlobalSeq?: number;
    status: DreamBacklogStatus;
    candidates: DeepWriteCandidateRecord[];
}
export interface DreamCuratorWorkerDeps {
    eventStore: EventStore;
    dreamLedgerStore: DreamLedgerStore;
    candidateStore: DeepWriteCandidateStore;
}
export declare class DreamCuratorWorker {
    private readonly deps;
    constructor(deps: DreamCuratorWorkerDeps);
    run(options?: DreamCuratorRunOptions): Promise<DreamCuratorRunResult>;
    private buildCandidates;
    private isDreamableEvent;
    private toEvidence;
    private singleSessionId;
}
//# sourceMappingURL=DreamCuratorWorker.d.ts.map