/**
 * SecondaryRecallTool.ts
 * brain_recall tool — re-runs BrainRecall with a new query.
 * Phase 48 — v1.1
 */
import type { FactRecord, EventRecord } from '../../store/FactStore.js';
import type { RecallFunction } from '../ExecutionLoop.js';
export interface SecondaryRecallInput {
    query: string;
    entityHint?: string;
    limit?: number;
    projectId?: string;
    topicPath?: string;
}
export interface SecondaryRecallOutput {
    facts: FactRecord[];
    events: EventRecord[];
    summaries?: NonNullable<import('../../types/BrainRecallResult.js').BrainRecallResult['summaries']>;
    strategy: string;
    totalHits: number;
}
export declare class SecondaryRecallTool {
    private readonly recallFn;
    constructor(recallFn: RecallFunction);
    execute(input: SecondaryRecallInput): Promise<SecondaryRecallOutput>;
}
//# sourceMappingURL=SecondaryRecallTool.d.ts.map