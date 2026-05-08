import type { MemoryGraph } from '../core/MemoryGraph.js';
import type { IterativeLLMClarifier } from '../routing/IterativeLLMClarifier.js';
export interface DistillationInput {
    projectId: string;
    episodicNeuronIds: string[];
    topicPath?: string;
}
export interface DistillationResult {
    semanticNeuronId: string;
    principle: string;
    sourceNeuronCount: number;
    createdAt: number;
}
export declare class EpisodicSemanticDistiller {
    private readonly memoryGraph;
    private readonly clarifier;
    private readonly maxEpisodicPerBatch;
    private readonly minBatchSize;
    constructor(memoryGraph: MemoryGraph, clarifier: IterativeLLMClarifier, options?: {
        maxEpisodicPerBatch?: number;
        minBatchSize?: number;
    });
    distill(input: DistillationInput): Promise<DistillationResult | null>;
}
//# sourceMappingURL=EpisodicSemanticDistiller.d.ts.map