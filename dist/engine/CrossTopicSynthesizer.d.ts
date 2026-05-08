import type { MemoryGraph } from '../core/MemoryGraph.js';
import type { IterativeLLMClarifier } from '../routing/IterativeLLMClarifier.js';
import type { CrossTopicTrigger } from './CrossTopicTrigger.js';
export interface CrossSynthesisInput {
    projectId: string;
    semanticNeuronIds: string[];
    distinctTopics: string[];
}
export interface CrossSynthesisResult {
    principleNeuronId: string;
    principle: string;
    sourceTopics: string[];
    createdAt: number;
}
export declare class CrossTopicSynthesizer {
    private readonly memoryGraph;
    private readonly trigger;
    private readonly clarifier;
    private readonly options;
    constructor(memoryGraph: MemoryGraph, trigger: CrossTopicTrigger, clarifier: IterativeLLMClarifier, options?: {
        maxSourceNeuronsPerBatch?: number;
    });
    run(projectId: string): Promise<{
        principleNeuronsCreated: number;
    }>;
    private synthesize;
}
//# sourceMappingURL=CrossTopicSynthesizer.d.ts.map