import { ContextFusionPath, FusionResolutionReason, type ContextPack } from '../types/index.js';
import type { QueryTimePendingEntityResolutionHookOutput } from '../types/QueryTimePendingEntityResolution.js';
export interface EvidenceFusionPolicyInput {
    compiledFacts: ContextPack['compiledFacts'];
    compiledEvidence: ContextPack['compiledEvidence'];
    rawEvidence: ContextPack['rawEvidence'];
    supportingEpisodes: ContextPack['supportingEpisodes'];
    queryTimePendingEntityResolution?: QueryTimePendingEntityResolutionHookOutput;
}
export interface EvidenceFusionPolicyDecision {
    fusionPath: ContextFusionPath;
    chosenEvidence: Array<{
        source: 'compiled' | 'raw';
        evidenceId: string;
    }>;
    rejectedEvidence: Array<{
        source: 'compiled' | 'raw';
        evidenceId: string;
        reason: string;
    }>;
    resolutionReason?: FusionResolutionReason;
    conflictTrace: ContextPack['conflictTrace'];
}
export interface EvidenceFusionPolicy {
    decide(input: EvidenceFusionPolicyInput): EvidenceFusionPolicyDecision;
}
export declare class DefaultEvidenceFusionPolicy implements EvidenceFusionPolicy {
    decide(input: EvidenceFusionPolicyInput): EvidenceFusionPolicyDecision;
}
//# sourceMappingURL=EvidenceFusionPolicy.d.ts.map