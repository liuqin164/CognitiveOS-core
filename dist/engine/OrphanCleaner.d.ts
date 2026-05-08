import type { MemoryGraph } from '../core/MemoryGraph.js';
export interface OrphanCleanerOptions {
    orphanAgeMs?: number;
    batchSize?: number;
}
export declare class OrphanCleaner {
    private readonly memoryGraph;
    private readonly options;
    constructor(memoryGraph: MemoryGraph, options?: OrphanCleanerOptions);
    run(projectId: string): Promise<{
        orphansMarked: number;
    }>;
    private degree;
}
//# sourceMappingURL=OrphanCleaner.d.ts.map