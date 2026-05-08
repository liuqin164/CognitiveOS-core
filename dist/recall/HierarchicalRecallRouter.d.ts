import type { MemoryGraph } from '../core/MemoryGraph.js';
export interface TopicRouteResult {
    matchedTopicPath: string | null;
    confidence: number;
    candidateNeuronIds: string[];
    fallbackToGlobal: boolean;
}
export interface HierarchicalRecallRouterOptions {
    minConfidence?: number;
    maxCandidates?: number;
}
export declare class HierarchicalRecallRouter {
    private readonly memoryGraph;
    private readonly options;
    constructor(memoryGraph: MemoryGraph, options?: HierarchicalRecallRouterOptions);
    route(query: string, projectId?: string, hintTopicPath?: string): TopicRouteResult;
    scoreTopics(query: string, topics: string[]): Array<{
        path: string;
        score: number;
    }>;
    topicScore(query: string, topicPath: string): number;
}
export declare function normalizeTopicPath(topicPath?: string): string | undefined;
//# sourceMappingURL=HierarchicalRecallRouter.d.ts.map