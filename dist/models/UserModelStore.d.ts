import type Database from 'bun:sqlite';
import { type UserInsight, type UserInsightCategory } from './UserInsight.js';
export declare class UserModelStore {
    private readonly db;
    constructor(db: Database);
    initSchema(): void;
    upsert(insight: UserInsight): void;
    query(projectId: string, options?: {
        categories?: UserInsightCategory[];
        minConfidence?: number;
        limit?: number;
    }): UserInsight[];
    reinforce(insightId: string, newEvidenceNeuronIds: string[]): void;
    evictExpired(now?: number): number;
    get(insightId: string): UserInsight | null;
    private findByIdentity;
    private mapRow;
    private ensureColumn;
}
//# sourceMappingURL=UserModelStore.d.ts.map