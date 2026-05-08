import type { FileUnderstandingInput, FileUnderstandingPolicy, FileUnderstandingProvider } from '../assets/providers/types.js';
export interface ModelCapabilityRouterDecision {
    provider: FileUnderstandingProvider | null;
    reason: string;
    requiresUserApproval: boolean;
}
export declare class ModelCapabilityRouter {
    private readonly providers;
    private readonly policy;
    constructor(providers?: FileUnderstandingProvider[], policy?: FileUnderstandingPolicy);
    register(provider: FileUnderstandingProvider): void;
    choose(input: FileUnderstandingInput): ModelCapabilityRouterDecision;
    private matchesCapability;
    private withinSizeLimit;
    private rankProvider;
}
//# sourceMappingURL=ModelCapabilityRouter.d.ts.map