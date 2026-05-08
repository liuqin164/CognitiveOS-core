import type { SemanticCompilation } from '../engine/LocalSemanticCompiler.js';
import type { EntityResolutionResult } from '../engine/EntityResolutionEngine.js';
import type { EntityStore } from '../store/EntityStore.js';
import type { QueryIR } from '../types/query-ir.js';
import type { Neuron } from '../types/index.js';
export type QueryTimePendingResolutionStatus = 'not_applicable' | 'not_needed' | 'narrowed_but_still_ambiguous' | 'resolved_narrowly' | 'unresolved_explicit';
export type QueryTimePendingResolutionReason = 'no_relative_pending_reference_in_query' | 'no_matching_pending_reference' | 'write_time_resolution_already_sufficient' | 'pending_capture_missing_or_too_weak' | 'pending_relative_reference_narrowed' | 'pending_relative_reference_ambiguous_after_narrowing' | 'pending_reference_still_unresolved';
export interface QueryTimePendingResolutionCandidate {
    entityId: string;
    score: number;
    reasons: string[];
}
export interface QueryTimePendingEntityResolutionResult {
    reference: string;
    queryTimeResolutionStatus: QueryTimePendingResolutionStatus;
    queryTimeResolutionReason: QueryTimePendingResolutionReason;
    resolutionConfidence: number;
    candidateEntityIds: string[];
    narrowedCandidates: QueryTimePendingResolutionCandidate[];
    matchedPendingIds: string[];
    contextNeuronIds: string[];
    resolvedInstanceId?: string;
}
export interface QueryTimePendingEntityResolverInput {
    query: string;
    ir: QueryIR;
    semanticCompilation: SemanticCompilation;
    baseEntityResolution: EntityResolutionResult;
    projectId?: string;
}
export interface QueryTimePendingEntityResolverOutput {
    overallStatus: QueryTimePendingResolutionStatus;
    overallReason: QueryTimePendingResolutionReason;
    resolvedEntityIds: string[];
    candidateEntityIds: string[];
    candidateNeuronIds: string[];
    results: QueryTimePendingEntityResolutionResult[];
    pendingCaptureMetrics: WriteTimePendingCaptureMetrics;
}
export interface WriteTimePendingCaptureMetrics {
    pending_record_emitted_count: number;
    pending_record_expected_but_missing_count: number;
    pending_candidate_set_nonempty_count: number;
    pending_candidate_set_empty_count: number;
    referential_signal_preserved_count: number;
    referential_signal_lost_count: number;
    query_time_not_needed_due_to_write_time_sufficient_count: number;
    query_time_not_needed_due_to_missing_pending_capture_count: number;
}
export declare class QueryTimePendingEntityResolver {
    private entityStore;
    private getNeuronById;
    private resolveBeforeTime;
    constructor(entityStore: EntityStore, getNeuronById: (neuronId: string) => Neuron | null, resolveBeforeTime: (ir: QueryIR) => number | undefined);
    resolve(input: QueryTimePendingEntityResolverInput): QueryTimePendingEntityResolverOutput;
    private collectRelativeReferences;
    private findMatchingPendingRecords;
    private canResolveNarrowly;
    private inferOverallStatus;
    private inferOverallReason;
    private inferNoPendingReason;
    private hasWriteTimeSufficientEntityResolution;
    private computePendingCaptureMetrics;
    private inferPendingScopedProjectId;
    private findSameTypePendingFallback;
}
//# sourceMappingURL=QueryTimePendingEntityResolver.d.ts.map