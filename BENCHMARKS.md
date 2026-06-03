# Benchmarks

Core benchmarks must prove natural memory emergence, not only recall@k.

## Natural Emergence Group

The `memory_natural_emergence` benchmark group runs on the `memory_recall` eval suite and tracks:

- `critical_memory_recall_rate`
- `old_but_important_recall_rate`
- `stale_memory_leakage_rate`
- `superseded_fact_leakage_rate`
- `suspect_memory_leakage_rate`
- `cross_project_leakage_rate`
- `provenance_completeness_rate`
- `context_budget_efficiency`
- `pulse_activation_useful_expansion_rate`
- `inhibition_correctness_rate`

This group checks both activation and inhibition: the kernel should surface old but important memories while suppressing stale, superseded, suspect, and cross-project evidence.

## Baselines

Use external benchmark ideas only as baselines or measurements:

- fixed recent window baseline
- vector topK baseline
- full-context baseline
- token saving metric
- latency metric
- provenance completeness metric

These baselines must not become the default agent-facing memory path. The default path remains structure-first universe navigation with pulse activation, temporal traversal, governance suppression, and bounded context.
