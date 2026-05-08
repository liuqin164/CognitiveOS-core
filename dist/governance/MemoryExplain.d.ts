import type Database from 'bun:sqlite';
import { CredibilityScorer } from './CredibilityScorer.js';
import { DecayPolicy } from './DecayPolicy.js';
import { type SupersedeRecord } from './SupersedeChain.js';
export declare class MemoryExplain {
    private db;
    private scorer;
    private decay;
    private readonly chain;
    constructor(db: Database, scorer: CredibilityScorer, decay: DecayPolicy);
    explainRecall(params: {
        query: string;
        recalled: Array<{
            factId: string;
            content: string;
            sourceType?: string;
            lastAccessedAt?: number;
        }>;
        excluded: Array<{
            factId: string;
            content: string;
            reason: 'decayed' | 'superseded' | 'low_credibility';
        }>;
    }): {
        included: Array<{
            factId: string;
            reason: string;
            credibilityScore: number;
            weight: number;
        }>;
        excluded: Array<{
            factId: string;
            reason: string;
        }>;
    };
    explainFact(factId: string): {
        factId: string;
        credibilityScore: number;
        currentWeight: number;
        status: string;
        supersedeChain: SupersedeRecord[];
        lastAccessedAt?: number;
        sourceType?: string;
    } | null;
}
//# sourceMappingURL=MemoryExplain.d.ts.map