import type { ObservationPattern, PolicyProposal } from './types.js';
/**
 * @public experimental
 */
export declare class PolicyProposalGenerator {
    generate(patterns: ObservationPattern[]): PolicyProposal[];
    private buildEvidence;
    private buildBase;
    private finalizeProposal;
}
//# sourceMappingURL=PolicyProposalGenerator.d.ts.map