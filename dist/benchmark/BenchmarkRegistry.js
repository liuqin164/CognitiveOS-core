export const BENCHMARK_GROUPS = [
    {
        name: 'context_pack_efficiency',
        suiteName: 'context_pack',
        baselines: [
            { metricKey: 'brain_vs_dump_token_ratio', label: 'token_ratio', operator: '<=', threshold: 0.05, formatAs: 'percent' }
        ]
    },
    {
        name: 'long_horizon_task',
        suiteName: 'long_horizon',
        baselines: [
            { metricKey: 'resume_success_rate', label: 'resume_rate', operator: '=', threshold: 1, formatAs: 'percent' }
        ]
    },
    {
        name: 'memory_governance',
        suiteName: 'memory_recall',
        baselines: [
            { metricKey: 'brain_stale_leakage', label: 'stale_leakage', operator: '=', threshold: 0, formatAs: 'percent' }
        ]
    },
    {
        name: 'memory_natural_emergence',
        suiteName: 'memory_recall',
        baselines: [
            { metricKey: 'critical_memory_recall_rate', label: 'critical_recall', operator: '>=', threshold: 0.9, formatAs: 'percent' },
            { metricKey: 'old_but_important_recall_rate', label: 'old_important_recall', operator: '>=', threshold: 0.85, formatAs: 'percent' },
            { metricKey: 'stale_memory_leakage_rate', label: 'stale_leakage', operator: '=', threshold: 0, formatAs: 'percent' },
            { metricKey: 'superseded_fact_leakage_rate', label: 'superseded_leakage', operator: '=', threshold: 0, formatAs: 'percent' },
            { metricKey: 'suspect_memory_leakage_rate', label: 'suspect_leakage', operator: '=', threshold: 0, formatAs: 'percent' },
            { metricKey: 'cross_project_leakage_rate', label: 'cross_project_leakage', operator: '=', threshold: 0, formatAs: 'percent' },
            { metricKey: 'provenance_completeness_rate', label: 'provenance_complete', operator: '>=', threshold: 0.95, formatAs: 'percent' },
            { metricKey: 'context_budget_efficiency', label: 'budget_efficiency', operator: '>=', threshold: 0.8, formatAs: 'percent' },
            { metricKey: 'pulse_activation_useful_expansion_rate', label: 'pulse_useful_expansion', operator: '>=', threshold: 0.5, formatAs: 'percent' },
            { metricKey: 'inhibition_correctness_rate', label: 'inhibition_correctness', operator: '>=', threshold: 0.95, formatAs: 'percent' }
        ]
    },
    {
        name: 'fast_path',
        suiteName: 'fast_path',
        baselines: [
            { metricKey: 'hit_rate', label: 'hit_rate', operator: '>=', threshold: 0.375, formatAs: 'percent' },
            { metricKey: 'misclassification_rate', label: 'misclass_rate', operator: '=', threshold: 0, formatAs: 'percent' }
        ]
    },
    {
        name: 'workspace_isolation',
        suiteName: 'workspace_isolation',
        baselines: [
            { metricKey: 'cross_workspace_leakage_rate', label: 'leakage', operator: '=', threshold: 0, formatAs: 'percent' }
        ]
    },
    {
        name: 'surface_latency',
        suiteName: 'surface_latency',
        baselines: [
            { metricKey: 'stream_p99_ms', label: 'stream_p99', operator: '<', threshold: 100, formatAs: 'ms' }
        ]
    },
    {
        name: 'notification_delivery',
        suiteName: 'notification_delivery',
        baselines: [
            { metricKey: 'delivery_rate', label: 'delivery_rate', operator: '=', threshold: 1, formatAs: 'percent' }
        ]
    },
    {
        name: 'session_continuity',
        suiteName: 'session_continuity',
        baselines: [
            { metricKey: 'continuity_rate', label: 'continuity', operator: '=', threshold: 1, formatAs: 'percent' }
        ]
    },
    {
        name: 'tool_use_quality',
        suiteName: 'tool_use_quality',
        baselines: [
            { metricKey: 'tool_call_usefulness_rate', label: 'usefulness', operator: '>=', threshold: 0.6, formatAs: 'percent' },
            { metricKey: 'unnecessary_tool_call_rate', label: 'unnecessary', operator: '<=', threshold: 0.2, formatAs: 'percent' },
            { metricKey: 'policy_rejection_rate', label: 'policy_rejection', operator: '<=', threshold: 0.3, formatAs: 'percent' },
            { metricKey: 'avg_evidence_budget_utilization', label: 'budget_utilization', operator: '<=', threshold: 0.8, formatAs: 'percent' },
            { metricKey: 'sanitization_hit_rate', label: 'sanitization_hit', operator: '<=', threshold: 0.05, formatAs: 'percent' }
        ]
    },
    {
        name: 'longmemeval_accuracy',
        suiteName: 'longmemeval',
        baselines: [
            { metricKey: 'accuracy', label: 'overall_accuracy', operator: '>=', threshold: 0.40, formatAs: 'percent' },
            { metricKey: 'accuracy_temporal', label: 'temporal_accuracy', operator: '>=', threshold: 0.30, formatAs: 'percent' }
        ]
    }
];
export function getBenchmarkGroup(groupName) {
    return BENCHMARK_GROUPS.find((group) => group.name === groupName);
}
