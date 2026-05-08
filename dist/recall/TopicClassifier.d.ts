import type { MemoryGraph } from '../core/MemoryGraph.js';
import type { Embedder } from '../store/Embedder.js';
import type { TopicRegistry } from './TopicRegistry.js';
export interface TopicClassifierOptions {
    confidenceThreshold?: number;
    embeddingThreshold?: number;
    enableEmbedding?: boolean;
    maxTopicsToScore?: number;
}
export interface TopicClassificationResult {
    topicPath?: string;
    confidence: number;
    strategy: 'lexical' | 'embedding' | 'fallback';
}
export declare class TopicClassifier {
    private readonly memoryGraph;
    private readonly options;
    private readonly topicRegistry?;
    private readonly embedder?;
    private readonly router;
    constructor(memoryGraph: MemoryGraph, options?: TopicClassifierOptions, topicRegistry?: TopicRegistry | undefined, embedder?: Embedder | undefined);
    classify(content: string, projectId?: string): TopicClassificationResult;
    classifyAsync(content: string, projectId?: string): Promise<TopicClassificationResult>;
    private classifyLexical;
    private classifyByEmbedding;
    private scoreTopicVector;
    private getRepresentativeNeurons;
    private cosineSimilarity;
    private getTopicPaths;
    private matchChineseTopic;
    private fallback;
}
//# sourceMappingURL=TopicClassifier.d.ts.map