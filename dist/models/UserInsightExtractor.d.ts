import type { MemoryGraph } from '../core/MemoryGraph.js';
import type { IterativeLLMClarifier } from '../routing/IterativeLLMClarifier.js';
import { type UserInsight } from './UserInsight.js';
import { UserModelStore } from './UserModelStore.js';
export interface UserInsightExtractorOptions {
    maxNeuronsPerRun?: number;
    triggerThreshold?: number;
}
export declare class UserInsightExtractor {
    private readonly memoryGraph;
    private readonly userModelStore;
    private readonly clarifier;
    private readonly maxNeuronsPerRun;
    private readonly triggerThreshold;
    constructor(memoryGraph: MemoryGraph, userModelStore: UserModelStore, clarifier: IterativeLLMClarifier, options?: UserInsightExtractorOptions);
    extract(projectId: string, windowMs?: number): Promise<UserInsight[]>;
    private buildPrompt;
}
//# sourceMappingURL=UserInsightExtractor.d.ts.map