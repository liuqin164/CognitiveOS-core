import { describe, expect, test } from 'bun:test';
import { ConfidenceGate } from '../src/routing/ConfidenceGate.js';
import type { BrainRecallResult } from '../src/recall/BrainRecall.js';
import type { FactRecord } from '../src/store/FactStore.js';
import type { Neuron } from '../src/types/index.js';

function buildFact(overrides: Partial<FactRecord> = {}): FactRecord {
  return {
    factId: 'fact-1',
    neuronId: 'neuron-1',
    subject: 'Project Atlas',
    predicateFamily: 'status',
    object: 'active',
    validFrom: 0,
    certaintyLevel: 'certain',
    confidence: 0.5,
    status: 'verified',
    sourceText: 'Project Atlas is active.',
    ...overrides
  };
}

function buildNeuron(id: string): Neuron {
  return {
    id,
    content: `content-${id}`,
    prev_hash: 'prev',
    self_hash: `hash-${id}`,
    coordinates: {
      T: 0,
      S: [0, 0, 0],
      V: []
    },
    synapses: [],
    metadata: {
      type: 'doc',
      createdAt: 0
    }
  };
}

function buildRecallResult(overrides: Partial<BrainRecallResult> = {}): BrainRecallResult {
  const compiledMemory = {
    beliefs: [],
    facts: [],
    events: [],
    entityTimeline: [],
    ...overrides.compiledMemory
  };

  return {
    query: 'test query',
    strategy: {
      primaryLevel: 'recent_unprocessed_sources',
      fallbackUsed: false,
      ...overrides.strategy
    },
    compiledMemory,
    rawEvidence: overrides.rawEvidence ?? [],
    fallbackSnippets: overrides.fallbackSnippets ?? [],
    profileSignals: overrides.profileSignals ?? [],
    profileSurface: overrides.profileSurface ?? {
      userProfile: [],
      agentPersona: []
    }
  };
}

describe('ConfidenceGate', () => {
  test('returns needs_llm for an empty recall result', () => {
    const gate = new ConfidenceGate();

    const result = gate.evaluate(buildRecallResult());

    expect(result.score).toBe(0);
    expect(result.verdict).toBe('needs_llm');
    expect(result.reason).toBe('none');
  });

  test('returns cpu_sufficient for one high-confidence compiled fact with strong supporting signals', () => {
    const gate = new ConfidenceGate();
    const fact = buildFact({
      subject: 'Sarah Chen',
      object: 'CTO',
      confidence: 0.92,
      validFrom: 1710000000000
    });

    const result = gate.evaluate(
      buildRecallResult({
        strategy: {
          primaryLevel: 'compiled_memory',
          fallbackUsed: false
        },
        compiledMemory: {
          beliefs: [],
          facts: [fact],
          events: [],
          entityTimeline: []
        },
        rawEvidence: [buildNeuron('neuron-1'), buildNeuron('neuron-2')]
      }),
      { entityHint: 'sarah' }
    );

    expect(result.verdict).toBe('cpu_sufficient');
    expect(result.score).toBe(0.95);
  });

  test('returns needs_llm when only raw evidence is present', () => {
    const gate = new ConfidenceGate();

    const result = gate.evaluate(
      buildRecallResult({
        strategy: {
          primaryLevel: 'raw_evidence',
          fallbackUsed: false
        },
        rawEvidence: [buildNeuron('neuron-1')]
      })
    );

    expect(result.score).toBe(0);
    expect(result.verdict).toBe('needs_llm');
  });

  test('honors a custom threshold for a single compiled fact', () => {
    const gate = new ConfidenceGate({ threshold: 0.3 });

    const result = gate.evaluate(
      buildRecallResult({
        strategy: {
          primaryLevel: 'compiled_memory',
          fallbackUsed: false
        },
        compiledMemory: {
          beliefs: [],
          facts: [buildFact()],
          events: [],
          entityTimeline: []
        }
      })
    );

    expect(result.score).toBe(0.3);
    expect(result.verdict).toBe('cpu_sufficient');
  });

  test('reports the individual signal breakdown accurately', () => {
    const gate = new ConfidenceGate();
    const fact = buildFact({
      subject: 'Atlas API',
      object: 'Payments',
      confidence: 0.91,
      validFrom: 1710000000000
    });

    const result = gate.evaluate(
      buildRecallResult({
        strategy: {
          primaryLevel: 'compiled_memory',
          fallbackUsed: false
        },
        compiledMemory: {
          beliefs: [],
          facts: [fact],
          events: [],
          entityTimeline: []
        },
        rawEvidence: [buildNeuron('neuron-1'), buildNeuron('neuron-2')]
      }),
      { entityHint: 'atlas' }
    );

    expect(result.signals).toEqual({
      hasCompiledFacts: true,
      highConfidenceFact: true,
      exactEntityMatch: true,
      graphEdgeTraversed: true,
      timeRangeClear: true,
      multipleCorroborating: false
    });
    expect(result.reason).toBe(
      'hasCompiledFacts, highConfidenceFact, exactEntityMatch, graphEdgeTraversed, timeRangeClear'
    );
  });
});
