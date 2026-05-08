import type { UserInsight } from './UserInsight.js';
import type { UserInsightExtractor } from './UserInsightExtractor.js';
import type { UserModelStore } from './UserModelStore.js';
import type { MemoryDelta, WorkingMemoryReporter } from './WorkingMemoryReporter.js';
export interface UserContext {
    projectId: string;
    insights: UserInsight[];
    delta?: MemoryDelta;
    toPromptFragment(): string;
}
export declare class UserModelManager {
    private readonly userModelStore;
    private readonly extractor;
    private readonly reporter?;
    private readonly latestDeltaByProject;
    constructor(userModelStore: UserModelStore, extractor: UserInsightExtractor, reporter?: WorkingMemoryReporter | undefined);
    refresh(projectId: string): Promise<void>;
    getUserContext(projectId: string, topK?: number): UserContext;
    evict(): void;
}
//# sourceMappingURL=UserModelManager.d.ts.map