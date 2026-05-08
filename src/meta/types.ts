import type { EvalSuiteName } from '../eval/runners/EvalRunner.js';

export type ProposalCategory =
  | 'risk_rule'
  | 'observation_filter'
  | 'memory_promotion'
  | 'approval_policy'
  | 'context_pack_policy'
  | 'system_intent_pattern'
  | 'capability_config'
  | 'workspace_preference'
  | 'benchmark_threshold'
  | 'skill_recovery'
  | 'SkillRefinement'
  | 'SkillBootstrap';

export type ProposalStatus =
  | 'pending'
  | 'under_eval'
  | 'passed_eval'
  | 'failed_eval'
  | 'approved'
  | 'applied'
  | 'rolled_back'
  | 'rejected';

export interface ProposalEvidence {
  traceEventId: string;
  note: string;
}

export interface PolicyProposal {
  id: string;
  proposedAt: number;
  category: ProposalCategory;
  summary: string;
  evidence: ProposalEvidence[];
  suggestedChange: Record<string, unknown>;
  status: ProposalStatus;
  evalReport?: string;
  approvedAt?: number;
  appliedAt?: number;
  rolledBackAt?: number;
  rejectedAt?: number;
  previousValue?: unknown;
  evalPlan?: EvalSuiteName[];
  riskLevel?: 'low' | 'medium' | 'high';
  applyMode?: 'config' | 'patch_only';
  predictedImpact?: PredictedImpact;
  actualOutcomeVerifiedAt?: number;
  verificationResult?: EvolutionVerificationResult;
}

export interface PredictedImpact {
  improvedTags: string[];
  potentialRegressionTags: string[];
  rationale: string;
}

export interface EvolutionVerificationResult {
  verifiedAt: number;
  improvedTagsActual: Record<string, { before: number; after: number }>;
  regressionTagsActual: Record<string, { before: number; after: number }>;
  verdict: 'confirmed' | 'partial' | 'regressed' | 'insufficient_data';
}

export interface ObservationPattern {
  type:
    | 'repeated_approval_reject'
    | 'repeated_url_filter'
    | 'flip_flop_supersede'
    | 'repeated_decay_after_promote'
    | 'fast_path_miss_pattern'
    | 'llm_fallback_pattern'
    | 'capability_failure_pattern'
    | 'benchmark_regression'
    | 'TopicReclassified';
  capabilityId?: string;
  url?: string;
  factId?: string;
  neuronId?: string;
  projectId?: string;
  from?: string;
  to?: string;
  content?: string;
  metricName?: string;
  currentValue?: number;
  baselineValue?: number;
  failureRate?: number;
  occurrenceCount: number;
  evidenceEventIds: string[];
}
