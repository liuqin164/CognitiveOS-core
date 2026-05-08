/**
 * IterativeLLMClarifier.ts
 * ReAct-style iterative LLM loop: LLM can issue brain tool calls between turns.
 * Phase 47 — v1.1
 */
import type { BrainRecallResult } from '../types/BrainRecallResult.js';
import type { AutonomyContext, ChatSessionLike } from '../types/ExtensionPoints.js';
import type { BrainToolCall, BrainToolResult } from './LLMToolSchema.js';
import { type EvidenceBudgetConfig } from './EvidenceBudgetManager.js';
import { ToolResultSanitizer } from './ToolResultSanitizer.js';
import { ToolUsePolicy } from './ToolUsePolicy.js';
import type { AnswerEvidenceTrace } from './AnswerEvidenceTrace.js';
import type { BoardEventBus } from '../boards/BoardEventBus.js';
import type { UserModelManager } from '../models/UserModelManager.js';
/** Record of one tool invocation within the clarification loop. */
export interface ToolCallRecord {
    call: BrainToolCall;
    result: BrainToolResult;
}
export interface IterativeLLMClarifierOptions {
    /** Maximum loop iterations. Defaults to 3. Hard-capped at MAX_ITERATIONS. */
    maxIterations?: number;
    /** Pre-built persona block to inject at prompt top. */
    personaBlock?: string;
    /** Active chat session for conversation history. */
    session?: ChatSessionLike;
    /** Optional hook called after each tool dispatch (for observability). */
    onToolCall?: (call: BrainToolCall, result: BrainToolResult) => void;
    /** CPU-side project scope. Never sourced from LLM tool-call JSON. */
    projectId?: string;
    /** CPU-side topic scope. Never sourced from LLM tool-call JSON. */
    topicPath?: string;
    /** Optional CPU policy. Defaults to permissive v1.1-compatible behavior when omitted. */
    policy?: ToolUsePolicy;
    /** Optional tool evidence budget config. Enables governed prompt evidence. */
    budgetConfig?: Partial<EvidenceBudgetConfig>;
    /** Optional sanitizer override. Defaults to ToolResultSanitizer. */
    sanitizer?: ToolResultSanitizer;
    /** Optional board event bus for llm_iteration.* observability. */
    boardEventBus?: BoardEventBus;
    /** v1.3 reserved context; accepted but intentionally unused in v1.2.1. */
    autonomyContext?: AutonomyContext;
    /** CPU sufficiency gate seed queries; dispatched as governed brain_recall calls before LLM iterations. */
    seedFollowupQueries?: string[];
    /** Optional user model prompt context. */
    userModelManager?: UserModelManager;
}
export interface ClarifierResult {
    finalAnswer: string;
    iterationsUsed: number;
    toolCallLog: ToolCallRecord[];
    stoppedByMaxIter: boolean;
    stoppedByPolicy: boolean;
    evidenceTrace: AnswerEvidenceTrace;
}
export interface BrainToolDispatcherLike {
    dispatch(call: BrainToolCall, context?: BrainToolDispatchContext): Promise<BrainToolResult>;
}
export interface BrainToolDispatchContext {
    projectId?: string;
    topicPath?: string;
}
/** Absolute hard ceiling on iterations, regardless of options. */
export declare const MAX_ITERATIONS = 5;
export declare class IterativeLLMClarifier {
    private readonly llmFn;
    private readonly dispatcher;
    private readonly options;
    private readonly maxIterations;
    private readonly toolSchemaBlock;
    constructor(llmFn: (prompt: string) => Promise<string>, dispatcher: BrainToolDispatcherLike, options?: IterativeLLMClarifierOptions);
    clarify(query: string, initialEvidence: BrainRecallResult): Promise<ClarifierResult>;
    private buildPrompt;
    private callKey;
    private callSignature;
    private buildEvidenceTrace;
    private emitIterationEvent;
    private executeGovernedToolCall;
}
//# sourceMappingURL=IterativeLLMClarifier.d.ts.map