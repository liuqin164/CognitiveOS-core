import type { MemoryGraph } from '../core/MemoryGraph.js';
import type { SummaryStore } from '../store/SummaryStore.js';
import type { Neuron } from '../types/index.js';
export interface TopicSummaryEntry {
    topicPath: string;
    projectId: string;
    summaryNeuronId: string;
    lastUpdatedAt: number;
    coveredNeuronCount: number;
}
export interface TopicSummaryRefreshOptions {
    forceRebuild?: boolean;
}
export declare class TopicSummaryBoard {
    private readonly memoryGraph;
    private readonly summaryStore;
    constructor(memoryGraph: MemoryGraph, summaryStore: SummaryStore);
    refresh(topicPath: string, projectId: string, options?: TopicSummaryRefreshOptions): string | null;
    listEntries(projectId?: string): TopicSummaryEntry[];
    getSummaryNeuron(topicPath: string, projectId?: string): Neuron | null;
    private getSourceNeurons;
    private isSummaryNeuron;
    private buildSummaryText;
    private compact;
    private archiveSummaryWithoutRecallableSources;
}
//# sourceMappingURL=TopicSummaryBoard.d.ts.map