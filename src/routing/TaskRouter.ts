import { randomUUID } from 'crypto';
import { IntentClassifier } from './IntentClassifier.js';
import type { TaskPlan, TaskStep } from './TaskPlan.js';

export class TaskRouter {
  constructor(private classifier: IntentClassifier = new IntentClassifier()) {}

  plan(
    query: string,
    options: {
      projectId?: string;
      confidenceThreshold?: number;
    } = {}
  ): TaskPlan {
    const classification = this.classifier.classify(query, { projectId: options.projectId });
    const threshold = options.confidenceThreshold ?? 0.6;
    const steps: TaskStep[] = [];

    steps.push(
      this.createStep('step_1', 'memory_recall', 'Recall memory evidence for the query', {
        query,
        entityHint: classification.entityHint,
        projectId: options.projectId
      }),
      this.createStep('step_2', 'confidence_check', 'Evaluate confidence of the recall evidence', {
        query,
        entityHint: classification.entityHint,
        projectId: options.projectId
      })
    );

    switch (classification.intentType) {
      case 'factual_recall':
      case 'entity_lookup':
        steps.push(this.createClarifyStep('step_3', 'Clarify low-confidence recall with LLM', 'step_2', threshold, {
          query,
          entityHint: classification.entityHint,
          projectId: options.projectId
        }));
        break;
      case 'temporal_recall':
        steps.push(
          this.createStep('step_3', 'fact_check', 'Check temporal facts for the hinted entity', {
            query,
            entityHint: classification.entityHint,
            projectId: options.projectId,
            subjectHint: classification.entityHint,
            predicateHint: 'any'
          }),
          this.createClarifyStep('step_4', 'Clarify low-confidence temporal evidence with LLM', 'step_3', threshold, {
            query,
            entityHint: classification.entityHint,
            projectId: options.projectId
          })
        );
        break;
      case 'cross_domain':
        steps.push(
          this.createStep('step_3', 'graph_traverse', 'Traverse connected memory graph for related domains', {
            query,
            entityHint: classification.entityHint,
            projectId: options.projectId
          }),
          this.createStep('step_4', 'confidence_check', 'Evaluate confidence of graph traversal evidence', {
            query,
            entityHint: classification.entityHint,
            projectId: options.projectId
          }),
          this.createClarifyStep('step_5', 'Clarify low-confidence graph evidence with LLM', 'step_4', threshold, {
            query,
            entityHint: classification.entityHint,
            projectId: options.projectId
          })
        );
        break;
      case 'correction_check':
        steps.push(
          this.createStep('step_3', 'fact_check', 'Check whether the prior fact was superseded', {
            query,
            entityHint: classification.entityHint,
            projectId: options.projectId,
            subjectHint: classification.entityHint,
            predicateHint: 'superseded'
          }),
          this.createClarifyStep('step_4', 'Clarify low-confidence correction evidence with LLM', 'step_2', threshold, {
            query,
            entityHint: classification.entityHint,
            projectId: options.projectId
          })
        );
        break;
      case 'open_ended':
        steps.push(this.createClarifyStep('step_3', 'Clarify open-ended request with LLM', 'step_2', threshold, {
          query,
          entityHint: classification.entityHint,
          projectId: options.projectId
        }));
        break;
    }

    return {
      planId: randomUUID(),
      intentType: classification.intentType,
      query,
      steps,
      estimatedLLMCalls: steps.filter((step) => step.type === 'llm_clarify').length
    };
  }

  private createStep(id: string, type: TaskStep['type'], label: string, inputs: TaskStep['inputs']): TaskStep {
    return {
      id,
      type,
      label,
      inputs,
      mayCallLLM: false
    };
  }

  private createClarifyStep(
    id: string,
    label: string,
    dependsOnStepId: string,
    threshold: number,
    inputs: TaskStep['inputs']
  ): TaskStep {
    return {
      id,
      type: 'llm_clarify',
      label,
      inputs,
      triggerCondition: {
        dependsOnStepId,
        metric: 'confidence_score',
        operator: 'lt',
        threshold
      },
      mayCallLLM: true
    };
  }
}
