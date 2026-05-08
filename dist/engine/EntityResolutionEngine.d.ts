import type { QueryIR } from '../types/query-ir.js';
import type { EntityDisambiguationCandidate, EntityRecord, EntityStore } from '../store/EntityStore.js';
export declare enum EntityInstanceDecisionSignal {
    STRONG_NEW_SIGNAL = "strong_new_signal",
    STRONG_UPDATE_SIGNAL = "strong_update_signal",
    AMBIGUOUS = "ambiguous"
}
export declare enum PendingEntityFallbackStrategy {
    ASSUME_NEW = "ASSUME_NEW",
    ASSUME_LATEST = "ASSUME_LATEST",
    STAY_PENDING = "STAY_PENDING"
}
export declare const STRONG_NEW_SIGNAL_PHRASES: readonly string[];
export declare const STRONG_UPDATE_SIGNAL_PHRASES: readonly string[];
export interface EntityInstanceResolutionDecision {
    normalizedText: string;
    signal: EntityInstanceDecisionSignal;
    matchedSignal?: string;
    fallback: PendingEntityFallbackStrategy;
    shouldCreatePending: boolean;
}
export interface EntityResolutionResult {
    resolved: EntityRecord[];
    relatedEntityIds: string[];
    candidateRefs: string[];
    confidence: number;
    disambiguation: Array<{
        reference: string;
        candidates: EntityDisambiguationCandidate[];
    }>;
}
export declare class EntityResolutionEngine {
    private entityStore;
    constructor(entityStore: EntityStore);
    resolve(input: {
        query: string;
        ir: QueryIR;
        projectId?: string;
    }): EntityResolutionResult;
    private resolveBeforeTime;
    private extractImplicitRefs;
    private inferType;
}
export declare function decideEntityInstanceResolution(text: string): EntityInstanceResolutionDecision;
//# sourceMappingURL=EntityResolutionEngine.d.ts.map