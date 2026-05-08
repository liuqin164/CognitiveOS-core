import type { BrainRecallResult } from '../types/BrainRecallResult.js';
export interface ConfidenceGateResult {
    score: number;
    verdict: 'cpu_sufficient' | 'needs_llm';
    reason: string;
    signals: {
        hasCompiledFacts: boolean;
        highConfidenceFact: boolean;
        exactEntityMatch: boolean;
        graphEdgeTraversed: boolean;
        timeRangeClear: boolean;
        multipleCorroborating: boolean;
    };
}
export declare class ConfidenceGate {
    private readonly threshold;
    constructor(options?: {
        threshold?: number;
    });
    evaluate(recallResult: BrainRecallResult, options?: {
        queryText?: string;
        entityHint?: string;
    }): ConfidenceGateResult;
    private matchesEntityHint;
}
//# sourceMappingURL=ConfidenceGate.d.ts.map