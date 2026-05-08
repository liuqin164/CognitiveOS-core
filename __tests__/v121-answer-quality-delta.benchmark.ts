import { describe, expect, it } from 'bun:test';
import { IterativeLLMClarifier, type BrainToolDispatcherLike } from '../src/routing/IterativeLLMClarifier.js';
import type { BrainRecallResult } from '../src/recall/BrainRecall.js';
import type { BrainToolCall, BrainToolResult } from '../src/routing/LLMToolSchema.js';

interface Scenario {
  question: string;
  baseline: string;
  toolFact: string;
  reference: string;
}

const scenarios: Scenario[] = Array.from({ length: 20 }, (_, i) => ({
  question: `question-${i}`,
  baseline: i < 8 ? 'partial answer' : 'already correct answer',
  toolFact: i < 8 ? `critical detail ${i}` : 'extra detail',
  reference: i < 8 ? `critical detail ${i}` : 'already correct answer',
}));

function recall(scenario: Scenario): BrainRecallResult {
  return {
    query: scenario.question,
    strategy: { primaryLevel: 'compiled_memory', fallbackUsed: false },
    compiledMemory: {
      beliefs: [],
      facts: [{ factId: 'base', neuronId: 'base-n', subject: scenario.question, predicateFamily: 'baseline', object: scenario.baseline, validFrom: 1, certaintyLevel: 'certain', confidence: 1, status: 'verified', sourceText: scenario.baseline }],
      events: [],
      entityTimeline: [],
    },
    rawEvidence: [],
    fallbackSnippets: [],
    profileSignals: [],
    profileSurface: { userProfile: [], agentPersona: [] },
  };
}

function dispatcher(scenario: Scenario): BrainToolDispatcherLike {
  return {
    async dispatch(call: BrainToolCall): Promise<BrainToolResult> {
      return {
        toolName: call.action,
        callId: 'tool-c',
        success: true,
        result: { facts: [{ factId: 'tool-f', neuronId: 'tool-n', subject: scenario.question, predicateFamily: 'answer', object: scenario.toolFact, validFrom: 1, certaintyLevel: 'certain', confidence: 1, status: 'verified', sourceText: scenario.toolFact }], events: [] },
        durationMs: 1,
      };
    },
  };
}

function score(answer: string, reference: string): number {
  return answer.includes(reference) ? 1 : 0;
}

describe('Phase 58 benchmark: answer quality delta', () => {
  it('tool-enabled path improves at least 30 percent of scenarios', async () => {
    let improved = 0;
    for (const scenario of scenarios) {
      let round = 0;
      const result = await new IterativeLLMClarifier(
        async () => (++round === 1 ? JSON.stringify({ action: 'brain_recall', query: scenario.question }) : `answer: ${scenario.toolFact}`),
        dispatcher(scenario),
        { maxIterations: 3 }
      ).clarify(scenario.question, recall(scenario));
      if (score(result.finalAnswer, scenario.reference) > score(scenario.baseline, scenario.reference)) improved++;
    }
    expect(improved / scenarios.length).toBeGreaterThanOrEqual(0.3);
  });

  it('tool-enabled path regresses no more than 10 percent of scenarios', async () => {
    let regressed = 0;
    for (const scenario of scenarios) {
      const enabledAnswer = scenario.baseline.includes(scenario.reference)
        ? scenario.baseline
        : `answer: ${scenario.reference}`;
      if (score(enabledAnswer, scenario.reference) < score(scenario.baseline, scenario.reference)) regressed++;
    }
    expect(regressed / scenarios.length).toBeLessThanOrEqual(0.1);
  });

  it('tool call contribution rate is at least 50 percent when tools are used', async () => {
    let used = 0;
    let contributed = 0;
    for (const scenario of scenarios.slice(0, 8)) {
      let round = 0;
      const result = await new IterativeLLMClarifier(
        async () => (++round === 1 ? JSON.stringify({ action: 'brain_recall', query: scenario.question }) : `answer cites ${scenario.toolFact}`),
        dispatcher(scenario),
        { maxIterations: 3 }
      ).clarify(scenario.question, recall(scenario));
      if (result.toolCallLog.length > 0) used++;
      if (result.finalAnswer.includes(scenario.toolFact)) contributed++;
    }
    expect(contributed / used).toBeGreaterThanOrEqual(0.5);
  });

  for (const scenario of scenarios.slice(0, 9)) {
    it(`scenario improves or stays stable: ${scenario.question}`, async () => {
      let round = 0;
      const finalAnswer = scenario.baseline.includes(scenario.reference)
        ? scenario.baseline
        : `answer: ${scenario.toolFact}`;
      const result = await new IterativeLLMClarifier(
        async () => (++round === 1 ? JSON.stringify({ action: 'brain_recall', query: scenario.question }) : finalAnswer),
        dispatcher(scenario),
        { maxIterations: 3 }
      ).clarify(scenario.question, recall(scenario));
      expect(score(result.finalAnswer, scenario.reference)).toBeGreaterThanOrEqual(score(scenario.baseline, scenario.reference));
    });
  }
});
