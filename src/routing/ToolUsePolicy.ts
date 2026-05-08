import type { EvidenceBudgetState } from './EvidenceBudgetManager.js';
import type { BrainToolCall, BrainToolName } from './LLMToolSchema.js';
import type { ToolCallRecord } from './IterativeLLMClarifier.js';
import { lexicalSimilarity } from '../utils/text.js';

export type PolicyDecision =
  | { verdict: 'approve'; call: BrainToolCall }
  | { verdict: 'rewrite'; call: BrainToolCall; reason: string }
  | { verdict: 'reject'; reason: string };

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

export class ToolUsePolicy {
  constructor(private readonly rules: ToolUsePolicyRule[] = defaultToolUsePolicyRules()) {}

  evaluate(call: BrainToolCall, ctx: ToolUsePolicyContext): PolicyDecision {
    for (const rule of this.rules) {
      const decision = rule.evaluate(call, ctx);
      if (decision) return decision;
    }
    return { verdict: 'approve', call };
  }
}

export class WorkspaceIsolationRule implements ToolUsePolicyRule {
  readonly name = 'workspace_isolation';

  evaluate(call: BrainToolCall, _context: ToolUsePolicyContext): PolicyDecision | null {
    const rawCall = call as unknown as Record<string, unknown>;
    if ('projectId' in rawCall || 'workspaceId' in rawCall) {
      return { verdict: 'reject', reason: 'Tool calls must not specify projectId/workspaceId; scope is CPU-controlled.' };
    }
    return null;
  }
}

export class SkillScopeRule implements ToolUsePolicyRule {
  readonly name = 'skill_scope';

  evaluate(call: BrainToolCall, _context: ToolUsePolicyContext): PolicyDecision | null {
    if (call.action !== 'find_skills') return null;
    const parameters = call as BrainToolCall & { projectId?: string; workspaceId?: string };
    if (parameters.projectId !== undefined || parameters.workspaceId !== undefined) {
      const rewritten = { ...call };
      delete (rewritten as BrainToolCall & { projectId?: string }).projectId;
      delete (rewritten as BrainToolCall & { workspaceId?: string }).workspaceId;
      return {
        verdict: 'rewrite',
        call: rewritten,
        reason: 'projectId/workspaceId is CPU-controlled, removed from skill discovery call.'
      };
    }
    return null;
  }
}

export class TopicScopeRule implements ToolUsePolicyRule {
  readonly name = 'topic_scope';

  evaluate(call: BrainToolCall, _context: ToolUsePolicyContext): PolicyDecision | null {
    const parameters = call as BrainToolCall & { topicPath?: string };
    if (parameters.topicPath === undefined) return null;

    const rewritten = { ...call };
    delete (rewritten as BrainToolCall & { topicPath?: string }).topicPath;
    return {
      verdict: 'rewrite',
      call: rewritten,
      reason: 'topicPath is CPU-controlled, removed from tool call.'
    };
  }
}

export class QueryRelevanceRule implements ToolUsePolicyRule {
  readonly name = 'query_relevance';

  constructor(private readonly threshold = 0.12) {}

  evaluate(call: BrainToolCall, context: ToolUsePolicyContext): PolicyDecision | null {
    const key = callText(call);
    if (!key) return null;

    const score = lexicalSimilarity(key, context.originalQuery);
    if (score < this.threshold) {
      return { verdict: 'reject', reason: `Tool query is not relevant enough to original query (score=${score.toFixed(2)}).` };
    }
    return null;
  }
}

export class DuplicateQueryRule implements ToolUsePolicyRule {
  readonly name = 'duplicate_query';

  evaluate(call: BrainToolCall, context: ToolUsePolicyContext): PolicyDecision | null {
    const signature = callSignature(call);
    const duplicated = context.toolCallLog.some((record) => callSignature(record.call) === signature);
    if (duplicated) {
      return { verdict: 'reject', reason: `Duplicate tool call rejected: ${signature}` };
    }
    return null;
  }
}

export class NovelEvidenceRule implements ToolUsePolicyRule {
  readonly name = 'novel_evidence';

  constructor(private readonly similarityThreshold = 0.7) {}

  evaluate(call: BrainToolCall, context: ToolUsePolicyContext): PolicyDecision | null {
    const last = context.lastToolResultSummary;
    if (!last) return null;
    const totalNew = last.newFactCount + last.newEventCount + last.newNeuronCount;
    if (totalNew > 0) return null;

    const previous = last.queryKey ?? callSignature(context.toolCallLog.at(-1)?.call);
    const current = callSignature(call);
    if (previous && lexicalSimilarity(previous, current) >= this.similarityThreshold) {
      return { verdict: 'reject', reason: 'Previous similar tool call produced no novel evidence.' };
    }
    return null;
  }
}

export class TokenBudgetPreCheckRule implements ToolUsePolicyRule {
  readonly name = 'token_budget_precheck';

  constructor(private readonly minRemainingTokens = 120, private readonly estimatedTokensPerItem = 80) {}

  evaluate(call: BrainToolCall, context: ToolUsePolicyContext): PolicyDecision | null {
    const budget = context.evidenceBudget;
    if (!budget) return null;
    if (budget.remainingTokens >= this.minRemainingTokens) return null;

    if (call.action === 'brain_recall' && (call.limit ?? 6) > 1) {
      return {
        verdict: 'rewrite',
        call: { ...call, limit: Math.max(1, Math.floor(budget.remainingTokens / this.estimatedTokensPerItem)) },
        reason: 'Reduced brain_recall limit to fit remaining evidence budget.',
      };
    }
    return { verdict: 'reject', reason: 'Insufficient evidence token budget for another tool call.' };
  }
}

export function defaultToolUsePolicyRules(): ToolUsePolicyRule[] {
  return [
    new SkillScopeRule(),
    new WorkspaceIsolationRule(),
    new TopicScopeRule(),
    new QueryRelevanceRule(),
    new DuplicateQueryRule(),
    new NovelEvidenceRule(),
    new TokenBudgetPreCheckRule(),
  ];
}

export function callSignature(call: BrainToolCall | undefined): string {
  if (!call) return '';
  return `${call.action}:${callText(call)}`;
}

function callText(call: BrainToolCall): string {
  if (call.action === 'brain_recall') return call.query ?? '';
  if (call.action === 'get_neuron_context') return call.neuron_id ?? '';
  if (call.action === 'expand_entity') return call.entity_name ?? '';
  if (call.action === 'find_file_assets') return [call.query, call.extension, call.mime_type].filter(Boolean).join(':');
  if (call.action === 'get_file_context') return [call.asset_id, call.chunk_index, call.radius].filter((value) => value !== undefined).join(':');
  if (call.action === 'find_skills') return call.query ?? '';
  return '';
}
