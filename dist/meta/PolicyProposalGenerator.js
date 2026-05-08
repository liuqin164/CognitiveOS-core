const DEFAULT_EVAL_PLAN = ['memory_recall'];
const PATCH_ONLY_CATEGORIES = new Set([
    'risk_rule',
    'observation_filter',
    'system_intent_pattern'
]);
/**
 * @public experimental
 */
export class PolicyProposalGenerator {
    generate(patterns) {
        return patterns.flatMap((pattern) => {
            const base = this.buildBase(pattern);
            if (!base)
                return [];
            return this.finalizeProposal({
                id: crypto.randomUUID(),
                proposedAt: Date.now(),
                category: base.category,
                summary: base.summary,
                evidence: this.buildEvidence(pattern),
                suggestedChange: base.suggestedChange,
                status: 'pending',
                evalPlan: base.evalPlan,
                riskLevel: base.riskLevel,
                applyMode: base.applyMode
            });
        });
    }
    buildEvidence(pattern) {
        return pattern.evidenceEventIds.map((traceEventId, index) => ({
            traceEventId,
            note: `${pattern.type} evidence #${index + 1}`
        }));
    }
    buildBase(pattern) {
        switch (pattern.type) {
            case 'repeated_approval_reject':
                return {
                    category: 'risk_rule',
                    summary: `用户反复拒绝 ${pattern.capabilityId} 类操作（${pattern.occurrenceCount}次），建议将该 capability 升级为 high risk`,
                    suggestedChange: {
                        capabilityId: pattern.capabilityId,
                        suggestRiskLevel: 'high',
                        currentOccurrences: pattern.occurrenceCount
                    },
                    evalPlan: ['memory_recall'],
                    riskLevel: 'high',
                    applyMode: 'patch_only'
                };
            case 'repeated_url_filter':
                return {
                    category: 'observation_filter',
                    summary: `URL ${pattern.url} 被过滤 ${pattern.occurrenceCount} 次，建议加入 ObservationFilter 黑名单`,
                    suggestedChange: {
                        url: pattern.url,
                        action: 'blocklist',
                        currentOccurrences: pattern.occurrenceCount
                    },
                    evalPlan: ['memory_recall'],
                    riskLevel: 'medium',
                    applyMode: 'patch_only'
                };
            case 'flip_flop_supersede':
                return {
                    category: 'memory_promotion',
                    summary: `fact ${pattern.factId} 被反复 promote（${pattern.occurrenceCount}次），需要人工审核以确认最终状态`,
                    suggestedChange: {
                        factId: pattern.factId,
                        action: 'mark_needs_llm_review',
                        currentOccurrences: pattern.occurrenceCount
                    },
                    evalPlan: ['memory_recall', 'session_continuity'],
                    riskLevel: 'low',
                    applyMode: 'config'
                };
            case 'repeated_decay_after_promote':
                return {
                    category: 'skill_recovery',
                    summary: `fact ${pattern.factId} promote 后反复衰减（${pattern.occurrenceCount}次），建议为相关 skill 制定恢复方案`,
                    suggestedChange: {
                        factId: pattern.factId,
                        action: 'prepare_skill_recovery_plan',
                        currentOccurrences: pattern.occurrenceCount
                    },
                    evalPlan: ['memory_recall', 'session_continuity'],
                    riskLevel: 'medium',
                    applyMode: 'patch_only'
                };
            case 'fast_path_miss_pattern':
                return {
                    category: 'context_pack_policy',
                    summary: `Fast Path 命中率持续低于基线（${pattern.currentValue}），建议调整 ContextPack token budget`,
                    suggestedChange: {
                        action: 'adjust_context_pack_token_budget',
                        currentValue: pattern.currentValue,
                        baselineValue: pattern.baselineValue,
                        currentOccurrences: pattern.occurrenceCount
                    },
                    evalPlan: ['fast_path', 'memory_recall'],
                    riskLevel: 'low',
                    applyMode: 'config'
                };
            case 'llm_fallback_pattern':
                return {
                    category: 'system_intent_pattern',
                    summary: `SystemIntentClassifier 持续 fallback 到 LLM（${pattern.occurrenceCount} 次），建议补充意图规则`,
                    suggestedChange: {
                        action: 'expand_intent_patterns',
                        currentOccurrences: pattern.occurrenceCount
                    },
                    evalPlan: ['memory_recall', 'context_pack'],
                    riskLevel: 'medium',
                    applyMode: 'patch_only'
                };
            case 'capability_failure_pattern':
                return {
                    category: 'capability_config',
                    summary: `Capability ${pattern.capabilityId ?? 'unknown'} 失败率过高（${pattern.failureRate}），建议调整风险配置`,
                    suggestedChange: {
                        capabilityId: pattern.capabilityId,
                        action: 'adjust_capability_risk_config',
                        failureRate: pattern.failureRate
                    },
                    evalPlan: ['memory_recall'],
                    riskLevel: 'medium',
                    applyMode: 'config'
                };
            case 'benchmark_regression':
                return {
                    category: 'benchmark_threshold',
                    summary: `Benchmark 指标 ${pattern.metricName} 低于基线（current: ${pattern.currentValue}, baseline: ${pattern.baselineValue}），建议审查阈值`,
                    suggestedChange: {
                        metricName: pattern.metricName,
                        currentValue: pattern.currentValue,
                        baselineValue: pattern.baselineValue,
                        action: 'review_benchmark_threshold'
                    },
                    evalPlan: ['memory_recall', 'fast_path', 'context_pack'],
                    riskLevel: 'high',
                    applyMode: 'patch_only'
                };
            case 'TopicReclassified':
                return null;
        }
    }
    finalizeProposal(proposal) {
        return {
            ...proposal,
            evalPlan: proposal.evalPlan && proposal.evalPlan.length > 0
                ? proposal.evalPlan
                : DEFAULT_EVAL_PLAN,
            riskLevel: proposal.riskLevel ?? 'medium',
            applyMode: PATCH_ONLY_CATEGORIES.has(proposal.category)
                ? 'patch_only'
                : (proposal.applyMode ?? 'patch_only')
        };
    }
}
