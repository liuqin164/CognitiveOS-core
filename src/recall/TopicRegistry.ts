import type { MemoryGraph } from '../core/MemoryGraph.js';

const GLOBAL_PROJECT_KEY = '__agent_brain_global__';

export class TopicRegistry {
  private readonly cache = new Map<string, string[]>();

  constructor(private readonly memoryGraph: MemoryGraph) {}

  /** Return known topic paths for a project, cached until invalidated. */
  getTopicPaths(projectId?: string): string[] {
    const key = this.cacheKey(projectId);
    const cached = this.cache.get(key);
    if (cached) return [...cached];

    const paths = this.memoryGraph.getTopicPaths(projectId);
    this.cache.set(key, [...paths]);
    return paths;
  }

  /** Invalidate topic cache after a write may have changed the topic directory. */
  invalidate(projectId?: string): void {
    this.cache.delete(this.cacheKey(projectId));
    this.cache.delete(GLOBAL_PROJECT_KEY);
  }

  private cacheKey(projectId?: string): string {
    return projectId ?? GLOBAL_PROJECT_KEY;
  }
}
