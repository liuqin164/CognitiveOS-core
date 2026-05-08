export type IntentType =
  | 'factual_recall'
  | 'temporal_recall'
  | 'entity_lookup'
  | 'cross_domain'
  | 'correction_check'
  | 'open_ended';

export type TaskStepType =
  | 'memory_recall'
  | 'fact_check'
  | 'graph_traverse'
  | 'confidence_check'
  | 'perception_call'
  | 'llm_clarify'
  | 'answer_assemble';

export interface TaskStep {
  id: string;
  type: TaskStepType;
  label: string;
  inputs: {
    query?: string;
    entityHint?: string;
    projectId?: string;
    subjectHint?: string;
    predicateHint?: string;
    capabilityId?: string;
    capabilityInput?: Record<string, unknown>;
  };
  triggerCondition?: {
    dependsOnStepId: string;
    metric: 'confidence_score';
    operator: 'lt';
    threshold: number;
  };
  mayCallLLM: boolean;
}

export interface TaskPlan {
  planId: string;
  intentType: IntentType;
  query: string;
  steps: TaskStep[];
  estimatedLLMCalls: number;
}
