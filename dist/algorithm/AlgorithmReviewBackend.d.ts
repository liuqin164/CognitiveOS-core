import type { Neuron } from '../types/index.js';
import type { EntityRecord } from '../store/EntityStore.js';
import type { FactRecord } from '../store/FactStore.js';
export type Awaitable<T> = T | Promise<T>;
export type AlgorithmReviewBackendMode = 'noop' | 'phase1_rule' | 'model_backed_phase2';
export type AlgorithmReviewVersion = 'phase1_rule_v1' | 'model_backed_phase2_v1';
export declare const PHASE1_RULE_REVIEW_VERSION: AlgorithmReviewVersion;
export declare const MODEL_BACKED_PHASE2_REVIEW_VERSION: AlgorithmReviewVersion;
export interface AlgorithmReviewProvenance {
    reviewBackendMode: Exclude<AlgorithmReviewBackendMode, 'noop'>;
    reviewVersion: AlgorithmReviewVersion;
    reviewKind: string;
    reviewFallbackFrom?: Exclude<AlgorithmReviewBackendMode, 'noop'>;
}
export declare function buildAlgorithmReviewMetadata(input: AlgorithmReviewProvenance & {
    provenance?: string;
    metadata?: Record<string, unknown>;
}): Record<string, unknown>;
export interface AlgorithmReviewSuggestedEntity {
    canonicalName: string;
    type: string;
    aliases?: string[];
    metadata?: Record<string, unknown>;
    instanceMode?: 'auto' | 'canonical' | 'new_instance';
}
export interface AlgorithmReviewSuggestedFact extends Omit<FactRecord, 'factId'> {
    metadata?: Record<string, unknown>;
}
export interface AlgorithmFactAdjudication {
    factId: string;
    action: 'verify' | 'archive' | 'reject' | 'supersede' | 'keep_provisional';
    reason: string;
    confidence?: number;
    supersededByFactId?: string;
    metadata?: Record<string, unknown>;
}
export interface AlgorithmAliasMergeSuggestion {
    primaryEntityId: string;
    duplicateEntityId: string;
    reason: string;
}
export interface ReviewProvisionalFactCandidatesInput {
    rawEpisodes: Neuron[];
    facts: FactRecord[];
    entities: EntityRecord[];
}
export interface ReviewProvisionalFactCandidatesResult {
    adjudications: AlgorithmFactAdjudication[];
    aliasMergeSuggestions: AlgorithmAliasMergeSuggestion[];
}
export interface ReviewSelfCorrectionCandidatesInput {
    rawEpisodes: Neuron[];
    facts: FactRecord[];
    entities: EntityRecord[];
}
export interface ReviewSelfCorrectionCandidatesResult {
    suggestedFacts: AlgorithmReviewSuggestedFact[];
}
export interface ReviewMultiFactExtractionCandidatesInput {
    rawEpisodes: Neuron[];
    facts: FactRecord[];
    entities: EntityRecord[];
    mode: 'offline' | 'enrichment';
}
export interface ReviewMultiFactExtractionCandidatesResult {
    suggestedEntities: AlgorithmReviewSuggestedEntity[];
    suggestedFacts: AlgorithmReviewSuggestedFact[];
}
export interface AlgorithmReviewBackend {
    reviewProvisionalFactCandidates(input: ReviewProvisionalFactCandidatesInput): Awaitable<ReviewProvisionalFactCandidatesResult>;
    reviewSelfCorrectionCandidates(input: ReviewSelfCorrectionCandidatesInput): Awaitable<ReviewSelfCorrectionCandidatesResult>;
    reviewMultiFactExtractionCandidates(input: ReviewMultiFactExtractionCandidatesInput): Awaitable<ReviewMultiFactExtractionCandidatesResult>;
}
export declare class NoopAlgorithmReviewBackend implements AlgorithmReviewBackend {
    reviewProvisionalFactCandidates(): ReviewProvisionalFactCandidatesResult;
    reviewSelfCorrectionCandidates(): ReviewSelfCorrectionCandidatesResult;
    reviewMultiFactExtractionCandidates(): ReviewMultiFactExtractionCandidatesResult;
}
export declare class Phase1RuleAlgorithmReviewBackend implements AlgorithmReviewBackend {
    reviewProvisionalFactCandidates(input: ReviewProvisionalFactCandidatesInput): ReviewProvisionalFactCandidatesResult;
    reviewSelfCorrectionCandidates(input: ReviewSelfCorrectionCandidatesInput): ReviewSelfCorrectionCandidatesResult;
    reviewMultiFactExtractionCandidates(input: ReviewMultiFactExtractionCandidatesInput): ReviewMultiFactExtractionCandidatesResult;
}
//# sourceMappingURL=AlgorithmReviewBackend.d.ts.map