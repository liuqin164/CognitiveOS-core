import { describe, expect, it } from 'bun:test';
import { IterativeLLMClarifier, type BrainToolDispatcherLike } from '../src/routing/IterativeLLMClarifier.js';
import { ToolUsePolicy, DuplicateQueryRule, NovelEvidenceRule } from '../src/routing/ToolUsePolicy.js';
import type { BrainRecallResult } from '../src/recall/BrainRecall.js';
import type { BrainToolCall, BrainToolResult } from '../src/routing/LLMToolSchema.js';

function recall(): BrainRecallResult {
  return {
    query: 'q',
    strategy: { primaryLevel: 'compiled_memory', fallbackUsed: false },
    compiledMemory: { beliefs: [], facts: [], events: [], entityTimeline: [] },
    rawEvidence: [],
    fallbackSnippets: [],
    profileSignals: [],
    profileSurface: { userProfile: [], agentPersona: [] },
  };
}

function dispatcher(factsPerCall = 1): BrainToolDispatcherLike {
  let calls = 0;
  return {
    async dispatch(call: BrainToolCall): Promise<BrainToolResult> {
      calls++;
      return {
        toolName: call.action,
        callId: `c-${calls}`,
        success: true,
        result: {
          facts: Array.from({ length: factsPerCall }, (_, i) => ({ factId: `f-${calls}-${i}`, subject: call.query ?? 'q', predicateFamily: 'detail', object: `detail-${i}` })),
          events: [],
        },
        durationMs: 1,
      };
    },
  };
}

describe('Phase 58 realistic LLM behavior', () => {
  it('handles burst convergence after four tool calls', async () => {
    let round = 0;
    const clarifier = new IterativeLLMClarifier(
      async () => {
        round++;
        return round <= 4 ? JSON.stringify({ action: 'brain_recall', query: `q ${round}` }) : 'final after tools';
      },
      dispatcher(),
      { maxIterations: 5 }
    );
    const result = await clarifier.clarify('q', recall());
    expect(result.iterationsUsed).toBe(5);
    expect(result.toolCallLog).toHaveLength(4);
    expect(result.stoppedByMaxIter).toBe(false);
  });

  it('treats missing required field as final answer', async () => {
    const result = await new IterativeLLMClarifier(async () => '{"action":"brain_recall"}', dispatcher(), { maxIterations: 1 }).clarify('q', recall());
    expect(result.finalAnswer).toBe('{"action":"brain_recall"}');
    expect(result.toolCallLog).toHaveLength(0);
  });

  it('treats unknown action as final answer', async () => {
    const result = await new IterativeLLMClarifier(async () => '{"action":"delete_all","query":"q"}', dispatcher(), { maxIterations: 1 }).clarify('q', recall());
    expect(result.toolCallLog).toHaveLength(0);
  });

  it('treats JSON array as final answer', async () => {
    const result = await new IterativeLLMClarifier(async () => '[{"action":"brain_recall","query":"q"}]', dispatcher(), { maxIterations: 1 }).clarify('q', recall());
    expect(result.toolCallLog).toHaveLength(0);
  });

  it('treats damaged JSON as final answer', async () => {
    const result = await new IterativeLLMClarifier(async () => "{action: 'brain_recall'", dispatcher(), { maxIterations: 1 }).clarify('q', recall());
    expect(result.toolCallLog).toHaveLength(0);
  });

  it('policy rejects repeated over-querying', async () => {
    let round = 0;
    const clarifier = new IterativeLLMClarifier(
      async () => {
        round++;
        return JSON.stringify({ action: 'brain_recall', query: 'same q' });
      },
      dispatcher(0),
      { maxIterations: 5, policy: new ToolUsePolicy([new DuplicateQueryRule(), new NovelEvidenceRule(0.5)]) }
    );
    const result = await clarifier.clarify('same q', recall());
    expect(result.toolCallLog).toHaveLength(1);
    expect(result.stoppedByPolicy).toBe(true);
  });

  for (const [name, output] of [
    ['missing get_neuron_context neuron_id', '{"action":"get_neuron_context"}'],
    ['missing expand_entity entity_name', '{"action":"expand_entity"}'],
    ['empty brain_recall query', '{"action":"brain_recall","query":""}'],
    ['non-object valid JSON', '"just a string"'],
  ] as const) {
    it(`parser degradation boundary: ${name}`, async () => {
      const result = await new IterativeLLMClarifier(async () => output, dispatcher(), { maxIterations: 1 }).clarify('q', recall());
      expect(result.finalAnswer).toBe(output);
      expect(result.toolCallLog).toHaveLength(0);
    });
  }

  it('100 mixed tasks preserve hard iteration ceiling', async () => {
    for (let task = 0; task < 100; task++) {
      let round = 0;
      const clarifier = new IterativeLLMClarifier(
        async () => {
          round++;
          if (task % 3 === 0 && round <= 2) return JSON.stringify({ action: 'brain_recall', query: `q ${task} ${round}` });
          if (task % 3 === 1) return '{"action":"brain_recall"}';
          return round === 1 ? JSON.stringify({ action: 'brain_recall', query: `q ${task}` }) : 'final';
        },
        dispatcher(),
        { maxIterations: 5 }
      );
      const result = await clarifier.clarify(`q ${task}`, recall());
      expect(result.iterationsUsed).toBeLessThanOrEqual(5);
    }
  });

  it('long chain never dispatches parser-null malformed outputs', async () => {
    let dispatches = 0;
    const d: BrainToolDispatcherLike = {
      async dispatch(call) {
        dispatches++;
        return { toolName: call.action, callId: 'c', success: true, result: {}, durationMs: 1 };
      },
    };
    await new IterativeLLMClarifier(async () => '{bad json', d, { maxIterations: 5 }).clarify('q', recall());
    expect(dispatches).toBe(0);
  });

  it('burst convergence records every real tool call id', async () => {
    let round = 0;
    const result = await new IterativeLLMClarifier(
      async () => (++round <= 3 ? JSON.stringify({ action: 'brain_recall', query: `q ${round}` }) : 'final'),
      dispatcher(),
      { maxIterations: 5 }
    ).clarify('q', recall());
    expect(result.evidenceTrace.toolCallIds).toEqual(['c-1', 'c-2', 'c-3']);
  });

  it('max iteration stop remains bounded for endless unique tool calls', async () => {
    let round = 0;
    const result = await new IterativeLLMClarifier(
      async () => JSON.stringify({ action: 'brain_recall', query: `unique ${++round}` }),
      dispatcher(),
      { maxIterations: 99 }
    ).clarify('q', recall());
    expect(result.toolCallLog.length).toBeLessThanOrEqual(5);
    expect(result.stoppedByMaxIter).toBe(true);
  });

  it('cycle detection stops repeated calls without exceeding hard cap', async () => {
    const result = await new IterativeLLMClarifier(
      async () => JSON.stringify({ action: 'brain_recall', query: 'same' }),
      dispatcher(),
      { maxIterations: 5 }
    ).clarify('q', recall());
    expect(result.toolCallLog).toHaveLength(1);
    expect(result.stoppedByMaxIter).toBe(true);
  });

  it('policy rejection still returns a final ClarifierResult shape', async () => {
    const result = await new IterativeLLMClarifier(
      async () => JSON.stringify({ action: 'brain_recall', query: 'same' }),
      dispatcher(),
      { maxIterations: 1, policy: new ToolUsePolicy([new DuplicateQueryRule()]) }
    ).clarify('q', {
      ...recall(),
      compiledMemory: { beliefs: [], facts: [], events: [], entityTimeline: [] },
    });
    expect(result.evidenceTrace.evidenceRefs[0].source).toBe('initial_recall');
  });

  it('final natural-language answer bypasses tool governance cleanly', async () => {
    const result = await new IterativeLLMClarifier(async () => 'natural final', dispatcher(), { maxIterations: 5 }).clarify('q', recall());
    expect(result.finalAnswer).toBe('natural final');
    expect(result.iterationsUsed).toBe(1);
  });

  it('prefixed valid JSON still behaves as a real tool call', async () => {
    const result = await new IterativeLLMClarifier(async () => 'I need more.\n{"action":"brain_recall","query":"q"}', dispatcher(), { maxIterations: 1 }).clarify('q', recall());
    expect(result.toolCallLog).toHaveLength(1);
  });

  it('malformed then later valid JSON extracts the valid object', async () => {
    const result = await new IterativeLLMClarifier(async () => '{bad}\n{"action":"brain_recall","query":"q"}', dispatcher(), { maxIterations: 1 }).clarify('q', recall());
    expect(result.toolCallLog).toHaveLength(1);
  });
});
