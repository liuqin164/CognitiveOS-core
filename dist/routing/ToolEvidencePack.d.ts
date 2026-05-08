import type { BeliefRecord } from '../types/index.js';
import type { EventRecord, FactRecord } from '../store/FactStore.js';
import type { BrainToolName } from './LLMToolSchema.js';
export interface NeuronEvidenceSummary {
    neuronId: string;
    contentPreview: string;
    tags: string[];
    type: string;
    createdAt?: number;
    projectId?: string;
}
export interface ToolEvidenceItem {
    toolCallId: string;
    toolName: BrainToolName;
    query: string;
    facts: FactRecord[];
    events: EventRecord[];
    neurons: NeuronEvidenceSummary[];
    entityIds: string[];
    beliefs: BeliefRecord[];
    relevanceScore: number;
    estimatedTokens: number;
    addedAt: number;
    projectId?: string;
    sanitized: boolean;
    injectionRiskDetected: boolean;
}
export declare class ToolEvidencePack {
    readonly items: ToolEvidenceItem[];
    add(item: ToolEvidenceItem): void;
    deduplicate(): void;
    totalTokens(): number;
    toPromptSummary(limit: number): string;
}
export declare function estimateTokens(text: string): number;
//# sourceMappingURL=ToolEvidencePack.d.ts.map