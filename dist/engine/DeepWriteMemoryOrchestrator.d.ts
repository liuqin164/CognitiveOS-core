import type { DeepWriteConfig } from './DeepWriteConfig.js';
import { DeepWriteMemoryCompiler, type DeepWriteMemoryCompilerInput, type DeepWriteTurnInput } from './DeepWriteMemoryCompiler.js';
import { DeepWriteCandidateStore } from '../store/DeepWriteCandidateStore.js';
import type { DeepWritePromotionPolicy } from './DeepWritePromotionPolicy.js';
import type { CustomRedactor, DeepWriteRedactor } from './DeepWriteRedactor.js';
export interface DeepWriteRecallResultLike {
    compiledMemory?: {
        facts?: unknown[];
        beliefs?: unknown[];
        events?: unknown[];
        entityTimeline?: unknown[];
    };
    rawEvidence?: Array<{
        id?: string;
        content?: string;
        metadata?: {
            createdAt?: number;
            tags?: string[];
        };
    }>;
    profileSurface?: {
        userProfile?: unknown[];
        agentPersona?: unknown[];
    };
}
export interface DeepWriteMemoryOrchestratorInput {
    projectId?: string;
    sessionId?: string;
    sourceNeuronIds: string[];
    currentExchange: DeepWriteMemoryCompilerInput['currentExchange'];
    recentTurns: DeepWriteTurnInput[];
}
export interface DeepWriteMemoryOrchestratorDeps {
    config: DeepWriteConfig;
    store: DeepWriteCandidateStore;
    compiler: DeepWriteMemoryCompiler;
    recall: (query: string, options?: {
        projectId?: string;
        limit?: number;
        includeRawEvidence?: boolean;
    }) => DeepWriteRecallResultLike;
    modelProvider?: string;
    modelName?: string;
    redactor?: DeepWriteRedactor;
    customRedactors?: CustomRedactor[];
    promotionPolicy?: DeepWritePromotionPolicy;
}
export declare class DeepWriteMemoryOrchestrator {
    private readonly deps;
    constructor(deps: DeepWriteMemoryOrchestratorDeps);
    run(input: DeepWriteMemoryOrchestratorInput): Promise<{
        runId?: string;
        candidateCount: number;
        skipped: boolean;
    }>;
    private flattenCandidates;
    private buildEvidenceRoleMap;
    private attachEvidenceRole;
}
//# sourceMappingURL=DeepWriteMemoryOrchestrator.d.ts.map