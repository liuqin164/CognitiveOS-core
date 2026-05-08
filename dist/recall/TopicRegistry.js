const GLOBAL_PROJECT_KEY = '__agent_brain_global__';
export class TopicRegistry {
    memoryGraph;
    cache = new Map();
    constructor(memoryGraph) {
        this.memoryGraph = memoryGraph;
    }
    /** Return known topic paths for a project, cached until invalidated. */
    getTopicPaths(projectId) {
        const key = this.cacheKey(projectId);
        const cached = this.cache.get(key);
        if (cached)
            return [...cached];
        const paths = this.memoryGraph.getTopicPaths(projectId);
        this.cache.set(key, [...paths]);
        return paths;
    }
    /** Invalidate topic cache after a write may have changed the topic directory. */
    invalidate(projectId) {
        this.cache.delete(this.cacheKey(projectId));
        this.cache.delete(GLOBAL_PROJECT_KEY);
    }
    cacheKey(projectId) {
        return projectId ?? GLOBAL_PROJECT_KEY;
    }
}
