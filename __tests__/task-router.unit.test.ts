import { describe, expect, test } from 'bun:test';
import { TaskRouter } from '../src/routing/TaskRouter.js';

describe('TaskRouter', () => {
  const router = new TaskRouter();

  test('classifies factual recall and plans a single conditional llm clarify step', () => {
    const plan = router.plan('what problem does my bluetooth earphone have?');

    expect(plan.intentType).toBe('factual_recall');
    expect(plan.steps.map((step) => step.type)).toEqual(['memory_recall', 'confidence_check', 'llm_clarify']);
    expect(plan.estimatedLLMCalls).toBe(1);
  });

  test('classifies temporal recall and includes fact_check', () => {
    const plan = router.plan('what did I tell you last week about the SDK project?');

    expect(plan.intentType).toBe('temporal_recall');
    expect(plan.steps.some((step) => step.type === 'fact_check')).toBe(true);
  });

  test('classifies cross-domain recall and includes graph_traverse', () => {
    const plan = router.plan('what bluetooth things have I been dealing with?');

    expect(plan.intentType).toBe('cross_domain');
    expect(plan.steps.some((step) => step.type === 'graph_traverse')).toBe(true);
  });

  test('classifies correction checks and uses superseded fact checks', () => {
    const plan = router.plan('actually the earphone model is XM5 not XM4');

    expect(plan.intentType).toBe('correction_check');
    expect(plan.steps.some((step) => step.type === 'fact_check' && step.inputs.predicateHint === 'superseded')).toBe(true);
  });

  test('always starts plans with memory recall', () => {
    const queries = [
      'what problem does my bluetooth earphone have?',
      'what did I tell you last week about the SDK project?',
      'what bluetooth things have I been dealing with?',
      'actually the earphone model is XM5 not XM4',
      'help me think through this'
    ];

    for (const query of queries) {
      const plan = router.plan(query);
      expect(plan.steps[0]?.type).toBe('memory_recall');
    }
  });

  test('marks llm clarify steps as llm-capable only', () => {
    const queries = [
      'what problem does my bluetooth earphone have?',
      'what did I tell you last week about the SDK project?',
      'what bluetooth things have I been dealing with?',
      'actually the earphone model is XM5 not XM4',
      'help me think through this'
    ];

    for (const query of queries) {
      const plan = router.plan(query);
      const llmSteps = plan.steps.filter((step) => step.type === 'llm_clarify');
      const cpuSteps = plan.steps.filter((step) => step.type !== 'llm_clarify');

      expect(llmSteps.length).toBeGreaterThan(0);
      expect(llmSteps.every((step) => step.mayCallLLM === true)).toBe(true);
      expect(cpuSteps.every((step) => step.mayCallLLM === false)).toBe(true);
    }
  });
});
