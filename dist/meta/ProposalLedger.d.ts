import type Database from 'bun:sqlite';
import type { PolicyProposal, ProposalCategory, ProposalStatus } from './types.js';
export declare class ProposalLedger {
    private db;
    constructor(db: Database);
    initSchema(): void;
    save(proposal: PolicyProposal): void;
    get(id: string): PolicyProposal | null;
    list(filter?: {
        status?: ProposalStatus;
        category?: ProposalCategory;
    }): PolicyProposal[];
    updateStatus(id: string, status: ProposalStatus, extras?: {
        evalReport?: string;
        approvedAt?: number;
        appliedAt?: number;
        rolledBackAt?: number;
        rejectedAt?: number;
        previousValue?: unknown;
        predictedImpact?: PolicyProposal['predictedImpact'];
        actualOutcomeVerifiedAt?: number;
        verificationResult?: PolicyProposal['verificationResult'];
    }): void;
    approve(id: string): void;
    apply(id: string, previousValue: unknown): void;
    rollback(id: string): void;
    reject(id: string): void;
    private mapRow;
    private ensureColumn;
    private parseEvalPlan;
    private parseJson;
    private requireProposal;
}
//# sourceMappingURL=ProposalLedger.d.ts.map