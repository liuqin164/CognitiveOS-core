import type { MemoryGraph } from '../core/MemoryGraph.js';
export interface CrossTopicTriggerOptions {
    semanticThreshold?: number;
    minDistinctTopics?: number;
    cooldownMs?: number;
}
export declare class CrossTopicTrigger {
    private readonly memoryGraph;
    private readonly options;
    private readonly lastTriggeredByBatch;
    constructor(memoryGraph: MemoryGraph, options?: CrossTopicTriggerOptions);
    findCandidateBatches(projectId: string): Array<{
        semanticNeuronIds: string[];
        distinctTopics: string[];
    }>;
}
//# sourceMappingURL=CrossTopicTrigger.d.ts.map