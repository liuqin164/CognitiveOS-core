import type { UserInsight } from './UserInsight.js';
import type { UserModelStore } from './UserModelStore.js';
export interface MemoryDelta {
    newInsights: UserInsight[];
    strengthenedInsights: UserInsight[];
    weakenedInsights: UserInsight[];
    expiredInsights: UserInsight[];
    snapshotAt: number;
}
export declare class WorkingMemoryReporter {
    private readonly userModelStore;
    constructor(userModelStore: UserModelStore);
    computeDelta(projectId: string, previousSnapshot: UserInsight[]): MemoryDelta;
    formatDelta(delta: MemoryDelta): string;
}
//# sourceMappingURL=WorkingMemoryReporter.d.ts.map