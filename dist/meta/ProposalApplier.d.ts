import { ProposalLedger } from './ProposalLedger.js';
import { TraceWriter } from '../observability/TraceWriter.js';
export interface ApplyResult {
    proposalId: string;
    applyMode: 'config' | 'patch_only';
    target: string;
    previousValue: unknown;
    skippedTrace: boolean;
}
export declare class ProposalApplier {
    private ledger;
    private traceWriter;
    private workspaceDir;
    constructor(ledger: ProposalLedger, traceWriter: TraceWriter, workspaceDir: string);
    apply(proposalId: string): Promise<ApplyResult>;
    rollback(proposalId: string): Promise<void>;
}
//# sourceMappingURL=ProposalApplier.d.ts.map