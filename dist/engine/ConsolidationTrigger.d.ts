import type { MemoryGraph } from '../core/MemoryGraph.js';
export interface ConsolidationTriggerOptions {
    episodicThreshold?: number;
    cooldownMs?: number;
}
export interface ConsolidationCandidate {
    topicPath: string;
    episodicNeuronIds: string[];
}
export declare class ConsolidationTrigger {
    private readonly memoryGraph;
    private readonly episodicThreshold;
    private readonly cooldownMs;
    constructor(memoryGraph: MemoryGraph, options?: ConsolidationTriggerOptions);
    findCandidates(projectId: string): ConsolidationCandidate[];
    private inCooldown;
}
//# sourceMappingURL=ConsolidationTrigger.d.ts.map