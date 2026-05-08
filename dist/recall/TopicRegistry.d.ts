import type { MemoryGraph } from '../core/MemoryGraph.js';
export declare class TopicRegistry {
    private readonly memoryGraph;
    private readonly cache;
    constructor(memoryGraph: MemoryGraph);
    /** Return known topic paths for a project, cached until invalidated. */
    getTopicPaths(projectId?: string): string[];
    /** Invalidate topic cache after a write may have changed the topic directory. */
    invalidate(projectId?: string): void;
    private cacheKey;
}
//# sourceMappingURL=TopicRegistry.d.ts.map