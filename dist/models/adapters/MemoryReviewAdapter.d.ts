import { type AlgorithmReviewBackend, type ReviewMultiFactExtractionCandidatesInput, type ReviewMultiFactExtractionCandidatesResult, type ReviewProvisionalFactCandidatesInput, type ReviewProvisionalFactCandidatesResult, type ReviewSelfCorrectionCandidatesInput, type ReviewSelfCorrectionCandidatesResult } from '../../algorithm/AlgorithmReviewBackend.js';
import { ModelRegistry } from '../ModelRegistry.js';
import type { TextGenerateFn } from '../ModelRole.js';
export declare class MemoryReviewAdapter implements AlgorithmReviewBackend {
    private generateFn;
    constructor(generateFn: TextGenerateFn);
    reviewProvisionalFactCandidates(input: ReviewProvisionalFactCandidatesInput): Promise<ReviewProvisionalFactCandidatesResult>;
    reviewSelfCorrectionCandidates(input: ReviewSelfCorrectionCandidatesInput): Promise<ReviewSelfCorrectionCandidatesResult>;
    reviewMultiFactExtractionCandidates(input: ReviewMultiFactExtractionCandidatesInput): Promise<ReviewMultiFactExtractionCandidatesResult>;
}
export declare function createMemoryReviewAdapter(registry: ModelRegistry): AlgorithmReviewBackend;
//# sourceMappingURL=MemoryReviewAdapter.d.ts.map