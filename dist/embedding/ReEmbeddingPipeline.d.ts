import type Database from 'bun:sqlite';
import type { MemoryGraph } from '../core/MemoryGraph.js';
import type { EmbeddingProvider } from './EmbeddingProvider.js';
import type { NeuronEmbeddingStore } from './NeuronEmbeddingStore.js';
export interface ReEmbeddingOptions {
    batchSize?: number;
    maxBudgetMs?: number;
}
export declare class ReEmbeddingPipeline {
    private readonly neuronEmbeddingStore;
    private readonly embeddingProvider;
    private readonly memoryGraph;
    private readonly db;
    private readonly options;
    private running;
    private readonly recentThroughput;
    constructor(neuronEmbeddingStore: NeuronEmbeddingStore, embeddingProvider: EmbeddingProvider, memoryGraph: MemoryGraph, db: Database, options?: ReEmbeddingOptions);
    run(projectId: string): Promise<{
        processed: number;
        remaining: number;
    }>;
    isRunning(): boolean;
    getRecentThroughput(): number | null;
    private initSchema;
    private readProgress;
    private saveProgress;
    private clearProgress;
    private recordThroughput;
}
//# sourceMappingURL=ReEmbeddingPipeline.d.ts.map