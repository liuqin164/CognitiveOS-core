/**
 * NeuronContextTool.ts
 * get_neuron_context tool — fetches a neuron's full content + 1-hop neighbors.
 * Phase 48 — v1.1
 */
import type { MemoryGraph } from '../../core/MemoryGraph.js';
import type { GraphEdgeStoreLike } from '../../types/ExtensionPoints.js';
export interface NeuronSummary {
    neuronId: string;
    content: string;
    tags: string[];
    type: string;
    projectId?: string;
}
export interface NeuronContextOutput {
    neuron: {
        neuronId: string;
        content: string;
        tags: string[];
        type: string;
        createdAt: number;
        projectId?: string;
    };
    neighbors: NeuronSummary[];
}
export declare class NeuronContextTool {
    private readonly memoryGraph;
    private readonly graphEdgeStore?;
    constructor(memoryGraph: MemoryGraph, graphEdgeStore?: GraphEdgeStoreLike | undefined);
    execute(neuronId: string, projectId?: string): NeuronContextOutput | null;
}
//# sourceMappingURL=NeuronContextTool.d.ts.map