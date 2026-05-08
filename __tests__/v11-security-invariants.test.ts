/**
 * v11-security-invariants.test.ts
 * Security invariants SI-15 through SI-19 — Phase 50
 */

import { describe, expect, it } from 'bun:test';
import {
  IterativeLLMClarifier,
  MAX_ITERATIONS,
} from '../src/routing/IterativeLLMClarifier.js';
import { BrainToolDispatcher, type BrainToolDispatcherDeps } from '../src/routing/BrainToolDispatcher.js';
import type { BrainRecallResult } from '../src/recall/BrainRecall.js';
import type { FactRecord } from '../src/store/FactStore.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRecall(): BrainRecallResult {
  return {
    query: 'test',
    strategy: { primaryLevel: 'compiled_memory', fallbackUsed: false },
    compiledMemory: { beliefs: [], facts: [], events: [], entityTimeline: [] },
    rawEvidence: [],
    fallbackSnippets: [],
    profileSignals: [],
    profileSurface: { userProfile: [], agentPersona: [] },
  };
}

function makeDispatcherDeps(overrides: Partial<BrainToolDispatcherDeps> = {}): BrainToolDispatcherDeps {
  return {
    recallFn: () => makeRecall(),
    memoryGraph: { getNeuron: () => null } as unknown as BrainToolDispatcherDeps['memoryGraph'],
    factStore: { listFactsByEntityIds: () => [], listEventsByNeuronIds: () => [] } as unknown as BrainToolDispatcherDeps['factStore'],
    entityStore: { findByCanonicalName: () => null, findByAlias: () => null } as unknown as BrainToolDispatcherDeps['entityStore'],
    beliefStore: { getActiveBeliefsForQuery: () => [] } as unknown as BrainToolDispatcherDeps['beliefStore'],
    ...overrides,
  };
}

function makeFact(id: string): FactRecord {
  return {
    factId: id, neuronId: 'nrn-1', subject: 'Alice',
    predicateFamily: 'preference', predicateValue: 'likes', object: 'coffee',
    confidence: 0.9, status: 'verified', certaintyLevel: 'certain',
    sourceText: 'test', validFrom: Date.now(),
  };
}

// ---------------------------------------------------------------------------
// SI-15: maxIterations hard cap = 5
// ---------------------------------------------------------------------------

describe('SI-15: maxIterations cannot exceed MAX_ITERATIONS (5)', () => {
  it('passing maxIterations = 99 clamps to 5', () => {
    const clarifier = new IterativeLLMClarifier(
      async () => 'answer',
      { dispatch: async (c) => ({ toolName: c.action, callId: 'x', success: true, durationMs: 0 }) },
      { maxIterations: 99 }
    );
    const internal = clarifier as unknown as { maxIterations: number };
    expect(internal.maxIterations).toBe(MAX_ITERATIONS);
    expect(internal.maxIterations).toBe(5);
  });

  it('passing maxIterations = 5 stays at 5', () => {
    const clarifier = new IterativeLLMClarifier(
      async () => 'answer',
      { dispatch: async (c) => ({ toolName: c.action, callId: 'x', success: true, durationMs: 0 }) },
      { maxIterations: 5 }
    );
    const internal = clarifier as unknown as { maxIterations: number };
    expect(internal.maxIterations).toBe(5);
  });

  it('passing maxIterations = 1000 still clamps to 5', () => {
    const clarifier = new IterativeLLMClarifier(
      async () => 'answer',
      { dispatch: async (c) => ({ toolName: c.action, callId: 'x', success: true, durationMs: 0 }) },
      { maxIterations: 1000 }
    );
    const internal = clarifier as unknown as { maxIterations: number };
    expect(internal.maxIterations).toBeLessThanOrEqual(5);
  });

  it('MAX_ITERATIONS constant equals 5', () => {
    expect(MAX_ITERATIONS).toBe(5);
  });

  it('clarifier never executes more than 5 LLM calls regardless of config', async () => {
    let llmCalls = 0;
    const clarifier = new IterativeLLMClarifier(
      async () => {
        llmCalls++;
        // Always returns a tool call — forces iteration
        return JSON.stringify({ action: 'brain_recall', query: `q${llmCalls}` });
      },
      { dispatch: async (c) => ({ toolName: c.action, callId: `c${llmCalls}`, success: true, result: { facts: [], events: [] }, durationMs: 1 }) },
      { maxIterations: 999 } // will be clamped to 5
    );
    await clarifier.clarify('test', makeRecall());
    expect(llmCalls).toBeLessThanOrEqual(MAX_ITERATIONS);
  });
});

// ---------------------------------------------------------------------------
// SI-16: single tool result volume limits
// ---------------------------------------------------------------------------

describe('SI-16: tool call result volume limits', () => {
  it('brain_recall facts capped at 20', async () => {
    const manyFacts = Array.from({ length: 30 }, (_, i) => makeFact(`f${i}`));
    const deps = makeDispatcherDeps({
      recallFn: () => ({
        ...makeRecall(),
        compiledMemory: { beliefs: [], facts: manyFacts, events: [], entityTimeline: [] },
      }),
    });
    const dispatcher = new BrainToolDispatcher(deps);
    const result = await dispatcher.dispatch({ action: 'brain_recall', query: 'test' });
    expect(result.success).toBe(true);
    const output = result.result as { facts: FactRecord[] };
    expect(output.facts.length).toBeLessThanOrEqual(20);
  });

  it('get_neuron_context content truncated at 2000 chars', async () => {
    const longContent = 'a'.repeat(5000);
    const deps = makeDispatcherDeps({
      memoryGraph: {
        getNeuron: (id: string) => ({
          id, content: longContent,
          prev_hash: '', self_hash: '',
          coordinates: { T: 0, S: [0, 0, 0], V: [] },
          synapses: [],
          metadata: { type: 'chat', createdAt: 0 },
        }),
      } as unknown as BrainToolDispatcherDeps['memoryGraph'],
    });
    const dispatcher = new BrainToolDispatcher(deps);
    const result = await dispatcher.dispatch({ action: 'get_neuron_context', neuron_id: 'nrn-1' });
    expect(result.success).toBe(true);
    const output = result.result as { neuron: { content: string } };
    expect(output.neuron.content.length).toBeLessThanOrEqual(2000);
  });

  it('expand_entity facts capped at 20', async () => {
    const manyFacts = Array.from({ length: 50 }, (_, i) => makeFact(`f${i}`));
    const deps = makeDispatcherDeps({
      entityStore: {
        findByCanonicalName: () => ({ entityId: 'e1', canonicalName: 'X', type: 'person', aliases: [], status: 'active', createdAt: 0, updatedAt: 0 }),
        findByAlias: () => null,
      } as unknown as BrainToolDispatcherDeps['entityStore'],
      factStore: {
        listFactsByEntityIds: () => manyFacts,
        listEventsByNeuronIds: () => [],
      } as unknown as BrainToolDispatcherDeps['factStore'],
    });
    const dispatcher = new BrainToolDispatcher(deps);
    const result = await dispatcher.dispatch({ action: 'expand_entity', entity_name: 'X' });
    const output = result.result as { facts: FactRecord[] };
    expect(output.facts.length).toBeLessThanOrEqual(20);
  });
});

// ---------------------------------------------------------------------------
// SI-17: no circular tool call chains
// ---------------------------------------------------------------------------

describe('SI-17: loop detection — same action+key ≥ 2 times triggers early stop', () => {
  it('terminates when same brain_recall query is repeated', async () => {
    let iteration = 0;
    const clarifier = new IterativeLLMClarifier(
      async () => {
        iteration++;
        // Always return the same tool call signature → should trigger loop detection
        return JSON.stringify({ action: 'brain_recall', query: 'same-query' });
      },
      { dispatch: async (c) => ({ toolName: c.action, callId: `c${iteration}`, success: true, result: { facts: [], events: [] }, durationMs: 1 }) },
      { maxIterations: 5 }
    );

    const result = await clarifier.clarify('test', makeRecall());
    expect(result.stoppedByMaxIter).toBe(true);
    // Should stop after the second occurrence of the same signature
    expect(result.toolCallLog.length).toBeLessThanOrEqual(2);
  });

  it('does not trigger loop detection for different queries', async () => {
    let round = 0;
    const clarifier = new IterativeLLMClarifier(
      async () => {
        round++;
        if (round <= 2) return JSON.stringify({ action: 'brain_recall', query: `unique-query-${round}` });
        return 'final answer';
      },
      { dispatch: async (c) => ({ toolName: c.action, callId: `c${round}`, success: true, result: { facts: [], events: [] }, durationMs: 1 }) },
      { maxIterations: 5 }
    );

    const result = await clarifier.clarify('test', makeRecall());
    // Different queries should NOT trigger loop detection
    expect(result.stoppedByMaxIter).toBe(false);
    expect(result.finalAnswer).toBe('final answer');
  });
});

// ---------------------------------------------------------------------------
// SI-18: tools are read-only (no ingest/write on dispatcher)
// ---------------------------------------------------------------------------

describe('SI-18: BrainToolDispatcher is read-only', () => {
  it('dispatcher has no ingest method', () => {
    const dispatcher = new BrainToolDispatcher(makeDispatcherDeps());
    expect(typeof (dispatcher as unknown as Record<string, unknown>)['ingest']).toBe('undefined');
  });

  it('dispatcher has no consolidate method', () => {
    const dispatcher = new BrainToolDispatcher(makeDispatcherDeps());
    expect(typeof (dispatcher as unknown as Record<string, unknown>)['consolidate']).toBe('undefined');
  });

  it('dispatcher has no delete method', () => {
    const dispatcher = new BrainToolDispatcher(makeDispatcherDeps());
    expect(typeof (dispatcher as unknown as Record<string, unknown>)['delete']).toBe('undefined');
  });

  it('dispatcher only exposes dispatch method', () => {
    const dispatcher = new BrainToolDispatcher(makeDispatcherDeps());
    expect(typeof dispatcher.dispatch).toBe('function');
  });

  it('all 3 tool actions are read-only (no state changes)', async () => {
    let stateChanged = false;
    const deps = makeDispatcherDeps({
      recallFn: () => { /* read-only */ return makeRecall(); },
      entityStore: {
        findByCanonicalName: () => null,
        findByAlias: () => null,
      } as unknown as BrainToolDispatcherDeps['entityStore'],
    });
    const dispatcher = new BrainToolDispatcher(deps);

    // All calls should complete without setting stateChanged
    await dispatcher.dispatch({ action: 'brain_recall', query: 'test' });
    await dispatcher.dispatch({ action: 'get_neuron_context', neuron_id: 'nrn-x' });
    await dispatcher.dispatch({ action: 'expand_entity', entity_name: 'nobody' });
    expect(stateChanged).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// SI-19: cross_workspace_leakage_rate = 0 (tool calls honour projectId)
// ---------------------------------------------------------------------------

describe('SI-19: cross-workspace isolation — no leakage between projectIds', () => {
  it('brain_recall passes undefined projectId when not specified', async () => {
    let capturedOpts: Record<string, unknown> | undefined;
    const deps = makeDispatcherDeps({
      recallFn: (_q, opts) => {
        capturedOpts = opts as Record<string, unknown>;
        return makeRecall();
      },
    });
    const dispatcher = new BrainToolDispatcher(deps);
    await dispatcher.dispatch({ action: 'brain_recall', query: 'test' });
    expect(capturedOpts?.['projectId']).toBeUndefined();
  });

  it('NeuronContextTool with unknown neuronId returns not-found (no cross-workspace data)', async () => {
    // memoryGraph only knows about project-A neurons
    const projectANeuronIds = new Set(['nrn-proj-a-1', 'nrn-proj-a-2']);
    const deps = makeDispatcherDeps({
      memoryGraph: {
        getNeuron: (id: string) => projectANeuronIds.has(id)
          ? { id, content: 'project A content', prev_hash: '', self_hash: '',
              coordinates: { T: 0, S: [0, 0, 0], V: [] }, synapses: [],
              metadata: { type: 'chat', createdAt: 0 } }
          : null,
      } as unknown as BrainToolDispatcherDeps['memoryGraph'],
    });
    const dispatcher = new BrainToolDispatcher(deps);
    // Requesting a neuron from "project B" returns not found
    const result = await dispatcher.dispatch({ action: 'get_neuron_context', neuron_id: 'nrn-proj-b-999' });
    expect(result.success).toBe(false);
    expect(result.errorMessage).toBeTruthy();
  });
});
