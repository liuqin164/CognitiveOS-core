import { lexicalSimilarity } from '../utils/text.js';
export class ToolUsePolicy {
    rules;
    constructor(rules = defaultToolUsePolicyRules()) {
        this.rules = rules;
    }
    evaluate(call, ctx) {
        for (const rule of this.rules) {
            const decision = rule.evaluate(call, ctx);
            if (decision)
                return decision;
        }
        return { verdict: 'approve', call };
    }
}
export class WorkspaceIsolationRule {
    name = 'workspace_isolation';
    evaluate(call, _context) {
        const rawCall = call;
        if ('projectId' in rawCall || 'workspaceId' in rawCall) {
            return { verdict: 'reject', reason: 'Tool calls must not specify projectId/workspaceId; scope is CPU-controlled.' };
        }
        return null;
    }
}
export class SkillScopeRule {
    name = 'skill_scope';
    evaluate(call, _context) {
        if (call.action !== 'find_skills')
            return null;
        const parameters = call;
        if (parameters.projectId !== undefined || parameters.workspaceId !== undefined) {
            const rewritten = { ...call };
            delete rewritten.projectId;
            delete rewritten.workspaceId;
            return {
                verdict: 'rewrite',
                call: rewritten,
                reason: 'projectId/workspaceId is CPU-controlled, removed from skill discovery call.'
            };
        }
        return null;
    }
}
export class TopicScopeRule {
    name = 'topic_scope';
    evaluate(call, _context) {
        const parameters = call;
        if (parameters.topicPath === undefined)
            return null;
        const rewritten = { ...call };
        delete rewritten.topicPath;
        return {
            verdict: 'rewrite',
            call: rewritten,
            reason: 'topicPath is CPU-controlled, removed from tool call.'
        };
    }
}
export class QueryRelevanceRule {
    threshold;
    name = 'query_relevance';
    constructor(threshold = 0.12) {
        this.threshold = threshold;
    }
    evaluate(call, context) {
        const key = callText(call);
        if (!key)
            return null;
        const score = lexicalSimilarity(key, context.originalQuery);
        if (score < this.threshold) {
            return { verdict: 'reject', reason: `Tool query is not relevant enough to original query (score=${score.toFixed(2)}).` };
        }
        return null;
    }
}
export class DuplicateQueryRule {
    name = 'duplicate_query';
    evaluate(call, context) {
        const signature = callSignature(call);
        const duplicated = context.toolCallLog.some((record) => callSignature(record.call) === signature);
        if (duplicated) {
            return { verdict: 'reject', reason: `Duplicate tool call rejected: ${signature}` };
        }
        return null;
    }
}
export class NovelEvidenceRule {
    similarityThreshold;
    name = 'novel_evidence';
    constructor(similarityThreshold = 0.7) {
        this.similarityThreshold = similarityThreshold;
    }
    evaluate(call, context) {
        const last = context.lastToolResultSummary;
        if (!last)
            return null;
        const totalNew = last.newFactCount + last.newEventCount + last.newNeuronCount;
        if (totalNew > 0)
            return null;
        const previous = last.queryKey ?? callSignature(context.toolCallLog.at(-1)?.call);
        const current = callSignature(call);
        if (previous && lexicalSimilarity(previous, current) >= this.similarityThreshold) {
            return { verdict: 'reject', reason: 'Previous similar tool call produced no novel evidence.' };
        }
        return null;
    }
}
export class TokenBudgetPreCheckRule {
    minRemainingTokens;
    estimatedTokensPerItem;
    name = 'token_budget_precheck';
    constructor(minRemainingTokens = 120, estimatedTokensPerItem = 80) {
        this.minRemainingTokens = minRemainingTokens;
        this.estimatedTokensPerItem = estimatedTokensPerItem;
    }
    evaluate(call, context) {
        const budget = context.evidenceBudget;
        if (!budget)
            return null;
        if (budget.remainingTokens >= this.minRemainingTokens)
            return null;
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
export function defaultToolUsePolicyRules() {
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
export function callSignature(call) {
    if (!call)
        return '';
    return `${call.action}:${callText(call)}`;
}
function callText(call) {
    if (call.action === 'brain_recall')
        return call.query ?? '';
    if (call.action === 'get_neuron_context')
        return call.neuron_id ?? '';
    if (call.action === 'expand_entity')
        return call.entity_name ?? '';
    if (call.action === 'find_file_assets')
        return [call.query, call.extension, call.mime_type].filter(Boolean).join(':');
    if (call.action === 'get_file_context')
        return [call.asset_id, call.chunk_index, call.radius].filter((value) => value !== undefined).join(':');
    if (call.action === 'find_skills')
        return call.query ?? '';
    return '';
}
