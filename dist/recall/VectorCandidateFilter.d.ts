import type { MemoryGraph } from '../core/MemoryGraph.js';
import type { Neuron } from '../types/index.js';
export interface VectorFilterContext {
    projectId?: string;
    topicPath?: string;
    queryTime: number;
    maxStaleMs?: number;
    entityHints?: string[];
}
export interface VectorFilterRule {
    name: string;
    filter(neuronIds: string[], context: VectorFilterContext): string[];
}
export declare class VectorCandidateFilter {
    private readonly rules;
    constructor(rules?: VectorFilterRule[]);
    filter(neuronIds: string[], ctx: VectorFilterContext): string[];
}
declare abstract class MemoryGraphVectorFilterRule implements VectorFilterRule {
    protected readonly memoryGraph: MemoryGraph;
    abstract readonly name: string;
    abstract filter(neuronIds: string[], context: VectorFilterContext): string[];
    constructor(memoryGraph: MemoryGraph);
    protected neuron(id: string): Neuron | null;
}
export declare class WorkspaceFilter extends MemoryGraphVectorFilterRule {
    readonly name = "workspace";
    filter(neuronIds: string[], context: VectorFilterContext): string[];
}
export declare class TopicFilter extends MemoryGraphVectorFilterRule {
    readonly name = "topic";
    filter(neuronIds: string[], context: VectorFilterContext): string[];
}
export declare class StaleFilter extends MemoryGraphVectorFilterRule {
    readonly name = "stale";
    filter(neuronIds: string[], context: VectorFilterContext): string[];
}
export declare class StatusFilter extends MemoryGraphVectorFilterRule {
    readonly name = "status";
    filter(neuronIds: string[], _context: VectorFilterContext): string[];
}
export declare class CredibilityFilter extends MemoryGraphVectorFilterRule {
    private readonly threshold;
    readonly name = "credibility";
    constructor(memoryGraph: MemoryGraph, threshold?: number);
    filter(neuronIds: string[], _context: VectorFilterContext): string[];
}
export declare function createDefaultVectorCandidateFilter(memoryGraph: MemoryGraph): VectorCandidateFilter;
export {};
//# sourceMappingURL=VectorCandidateFilter.d.ts.map