import { type AlgorithmReviewBackend, type AlgorithmReviewBackendMode, type ReviewMultiFactExtractionCandidatesInput, type ReviewMultiFactExtractionCandidatesResult, type ReviewProvisionalFactCandidatesInput, type ReviewProvisionalFactCandidatesResult, type ReviewSelfCorrectionCandidatesInput, type ReviewSelfCorrectionCandidatesResult } from './AlgorithmReviewBackend.js';
import { SemanticBackendRuntime } from '../backend/SemanticBackend.js';
import { ModelRegistry } from '../models/ModelRegistry.js';
export interface Phase2ModelReviewRuntime {
    reviewProvisionalFactCandidates(input: ReviewProvisionalFactCandidatesInput): Promise<Partial<ReviewProvisionalFactCandidatesResult>>;
    reviewSelfCorrectionCandidates(input: ReviewSelfCorrectionCandidatesInput): Promise<Partial<ReviewSelfCorrectionCandidatesResult>>;
    reviewMultiFactExtractionCandidates(input: ReviewMultiFactExtractionCandidatesInput): Promise<Partial<ReviewMultiFactExtractionCandidatesResult>>;
}
interface Phase2ModelAlgorithmReviewBackendOptions {
    semanticBackend?: SemanticBackendRuntime;
    modelRuntime?: Phase2ModelReviewRuntime;
    fallbackBackend?: AlgorithmReviewBackend;
    modelRegistry?: ModelRegistry;
}
export declare function resolveAlgorithmReviewBackendMode(): AlgorithmReviewBackendMode;
export declare function createAlgorithmReviewBackend(options?: Phase2ModelAlgorithmReviewBackendOptions): AlgorithmReviewBackend;
export declare class Phase2ModelAlgorithmReviewBackend implements AlgorithmReviewBackend {
    private readonly options;
    private readonly semanticBackend;
    private readonly fallbackBackend;
    private runtimePromise?;
    constructor(options?: Phase2ModelAlgorithmReviewBackendOptions);
    reviewProvisionalFactCandidates(input: ReviewProvisionalFactCandidatesInput): Promise<ReviewProvisionalFactCandidatesResult>;
    reviewSelfCorrectionCandidates(input: ReviewSelfCorrectionCandidatesInput): Promise<ReviewSelfCorrectionCandidatesResult>;
    reviewMultiFactExtractionCandidates(input: ReviewMultiFactExtractionCandidatesInput): Promise<ReviewMultiFactExtractionCandidatesResult>;
    private prepareRuntime;
    private createDefaultRuntime;
    private annotateFallbackProvisional;
    private annotateFallbackSuggestedFacts;
    private annotateFallbackMultiFact;
    private mergeAdjudications;
    private mergeAliasSuggestions;
    private mergeSuggestedEntities;
    private mergeSuggestedFacts;
    private factKey;
}
export {};
//# sourceMappingURL=Phase2ModelAlgorithmReviewBackend.d.ts.map