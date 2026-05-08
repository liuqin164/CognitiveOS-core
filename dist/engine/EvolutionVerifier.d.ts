import type { ProposalLedger } from '../meta/ProposalLedger.js';
import type { MemoryGraph } from '../core/MemoryGraph.js';
import type { IAuditLedger } from '../types/ExtensionPoints.js';
import type { ISkillMemoryStore } from '../types/ExtensionPoints.js';
export interface EvolutionVerifierOptions {
    minSamplesAfter?: number;
    verifyDelayMs?: number;
    minVerificationDelayMs?: number;
    maxVerifyPerRun?: number;
    memoryGraph?: MemoryGraph;
}
interface TagStats {
    samples: number;
    successRate: number;
}
type StatsCapableSkillStore = ISkillMemoryStore & {
    getExecutionStatsForTags?: (tags: string[], options: {
        before?: number;
        after?: number;
        projectId?: string;
    }) => Record<string, TagStats>;
};
export declare class EvolutionVerifier {
    private readonly skillMemoryStore;
    private readonly proposalLedger;
    private readonly auditLedger;
    private readonly options;
    constructor(skillMemoryStore: StatsCapableSkillStore, proposalLedger: ProposalLedger, auditLedger: IAuditLedger, options?: EvolutionVerifierOptions);
    verify(projectId: string): Promise<number>;
    verifyPending(projectId: string): Promise<{
        verified: number;
        skipped: number;
    }>;
    private verifyProposal;
    private stats;
    private writeRegressionObservation;
}
export {};
//# sourceMappingURL=EvolutionVerifier.d.ts.map