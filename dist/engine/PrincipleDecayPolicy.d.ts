import type { MemoryGraph } from '../core/MemoryGraph.js';
export interface PrincipleDecayPolicyOptions {
    staleDaysMs?: number;
    reinforcementOverlapThreshold?: number;
}
export interface PrincipleDecayPolicyResult {
    reinforced: number;
    degraded: number;
    markedStale: number;
}
export declare class PrincipleDecayPolicy {
    private readonly memoryGraph;
    private readonly options;
    constructor(memoryGraph: MemoryGraph, options?: PrincipleDecayPolicyOptions);
    run(projectId: string): Promise<PrincipleDecayPolicyResult>;
}
//# sourceMappingURL=PrincipleDecayPolicy.d.ts.map