import type { BrainToolCall, BrainToolResult } from './LLMToolSchema.js';
import { ToolEvidencePack, type ToolEvidenceItem } from './ToolEvidencePack.js';
export interface EvidenceBudgetConfig {
    maxTotalTokens: number;
    maxFactsPerPack: number;
    maxNeuronSummaries: number;
    compressionStrategy: 'drop_tail' | 'salience_sort' | 'summary';
}
export interface EvidenceBudgetState {
    usedTokens: number;
    remainingTokens: number;
    isOverBudget: boolean;
}
export declare class EvidenceBudgetManager {
    private readonly config;
    private readonly evidencePack;
    private readonly normalizer;
    constructor(config?: Partial<EvidenceBudgetConfig>);
    absorb(input: {
        toolResult: BrainToolResult;
        call: BrainToolCall;
        sanitizedResult: unknown;
        projectId?: string;
        injectionRiskDetected?: boolean;
    }): ToolEvidenceItem;
    state(): EvidenceBudgetState;
    pack(): ToolEvidencePack;
    compress(): void;
}
//# sourceMappingURL=EvidenceBudgetManager.d.ts.map