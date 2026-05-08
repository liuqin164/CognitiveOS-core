import type { EvidenceBudgetState } from './EvidenceBudgetManager.js';
import type { BrainToolCall, BrainToolName } from './LLMToolSchema.js';
import type { ToolCallRecord } from './IterativeLLMClarifier.js';
export type PolicyDecision = {
    verdict: 'approve';
    call: BrainToolCall;
} | {
    verdict: 'rewrite';
    call: BrainToolCall;
    reason: string;
} | {
    verdict: 'reject';
    reason: string;
};
export interface ToolUsePolicyRule {
    name: string;
    evaluate(call: BrainToolCall, context: ToolUsePolicyContext): PolicyDecision | null;
}
export interface ToolResultNoveltySummary {
    toolName: BrainToolName;
    queryKey?: string;
    newFactCount: number;
    newEventCount: number;
    newNeuronCount: number;
}
export interface ToolUsePolicyContext {
    currentIteration: number;
    maxIterations: number;
    toolCallLog: ToolCallRecord[];
    evidenceBudget?: EvidenceBudgetState;
    projectId?: string;
    topicPath?: string;
    originalQuery: string;
    lastToolResultSummary?: ToolResultNoveltySummary;
}
export declare class ToolUsePolicy {
    private readonly rules;
    constructor(rules?: ToolUsePolicyRule[]);
    evaluate(call: BrainToolCall, ctx: ToolUsePolicyContext): PolicyDecision;
}
export declare class WorkspaceIsolationRule implements ToolUsePolicyRule {
    readonly name = "workspace_isolation";
    evaluate(call: BrainToolCall, _context: ToolUsePolicyContext): PolicyDecision | null;
}
export declare class SkillScopeRule implements ToolUsePolicyRule {
    readonly name = "skill_scope";
    evaluate(call: BrainToolCall, _context: ToolUsePolicyContext): PolicyDecision | null;
}
export declare class TopicScopeRule implements ToolUsePolicyRule {
    readonly name = "topic_scope";
    evaluate(call: BrainToolCall, _context: ToolUsePolicyContext): PolicyDecision | null;
}
export declare class QueryRelevanceRule implements ToolUsePolicyRule {
    private readonly threshold;
    readonly name = "query_relevance";
    constructor(threshold?: number);
    evaluate(call: BrainToolCall, context: ToolUsePolicyContext): PolicyDecision | null;
}
export declare class DuplicateQueryRule implements ToolUsePolicyRule {
    readonly name = "duplicate_query";
    evaluate(call: BrainToolCall, context: ToolUsePolicyContext): PolicyDecision | null;
}
export declare class NovelEvidenceRule implements ToolUsePolicyRule {
    private readonly similarityThreshold;
    readonly name = "novel_evidence";
    constructor(similarityThreshold?: number);
    evaluate(call: BrainToolCall, context: ToolUsePolicyContext): PolicyDecision | null;
}
export declare class TokenBudgetPreCheckRule implements ToolUsePolicyRule {
    private readonly minRemainingTokens;
    private readonly estimatedTokensPerItem;
    readonly name = "token_budget_precheck";
    constructor(minRemainingTokens?: number, estimatedTokensPerItem?: number);
    evaluate(call: BrainToolCall, context: ToolUsePolicyContext): PolicyDecision | null;
}
export declare function defaultToolUsePolicyRules(): ToolUsePolicyRule[];
export declare function callSignature(call: BrainToolCall | undefined): string;
//# sourceMappingURL=ToolUsePolicy.d.ts.map