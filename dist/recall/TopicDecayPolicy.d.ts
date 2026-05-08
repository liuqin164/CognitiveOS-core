import type { MemoryGraph } from '../core/MemoryGraph.js';
export interface TopicDecayPolicyOptions {
    staleThresholdDays?: number;
    minNeuronCount?: number;
    decayImportanceLevel?: 'low' | 'normal';
}
export declare class TopicDecayPolicy {
    private readonly memoryGraph;
    private readonly options;
    constructor(memoryGraph: MemoryGraph, options?: TopicDecayPolicyOptions);
    findStalePaths(projectId?: string): string[];
    applyDecay(projectId?: string): number;
    private getSourceNeurons;
}
//# sourceMappingURL=TopicDecayPolicy.d.ts.map