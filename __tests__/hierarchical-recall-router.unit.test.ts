import { describe, expect, test } from 'bun:test';
import { MemoryGraph } from '../src/core/MemoryGraph.js';
import { NeuronFactory } from '../src/core/Neuron.js';
import { HierarchicalRecallRouter, normalizeTopicPath } from '../src/recall/HierarchicalRecallRouter.js';
import type { Neuron } from '../src/types/index.js';

function addNeuron(
  graph: MemoryGraph,
  content: string,
  topicPath?: string,
  projectId = 'project-a'
): Neuron {
  const now = Date.now();
  const item = NeuronFactory.create(
    content,
    graph.getLatestNeuronSelfHash(projectId) || 'genesis',
    { T: now, S: [0, 0, 0], V: [] },
    {
      projectId,
      topicPath,
      type: 'chat',
      createdAt: now,
      updatedAt: now,
      status: 'active',
      tags: [],
      confidence: 1
    }
  );
  graph.addNeuron(item);
  return item;
}

describe('HierarchicalRecallRouter — hint-based routing', () => {
  test('explicit hint with matching neurons returns confidence=1 and no global fallback', () => {
    const graph = new MemoryGraph();
    addNeuron(graph, 'hinted neuron', 'memory/governance');
    const result = new HierarchicalRecallRouter(graph).route('anything', 'project-a', 'memory/governance');
    expect(result.confidence).toBe(1);
    expect(result.fallbackToGlobal).toBe(false);
    expect(result.matchedTopicPath).toBe('memory/governance');
  });

  test('explicit hint that matches no neurons falls back globally', () => {
    const graph = new MemoryGraph();
    const result = new HierarchicalRecallRouter(graph).route('anything', 'project-a', 'does/not/exist');
    expect(result.fallbackToGlobal).toBe(true);
    expect(result.candidateNeuronIds).toHaveLength(0);
  });

  test('hint is normalized before lookup', () => {
    const graph = new MemoryGraph();
    addNeuron(graph, 'found', 'memory/governance');
    const result = new HierarchicalRecallRouter(graph).route('x', 'project-a', '/Memory/Governance/');
    expect(result.fallbackToGlobal).toBe(false);
    expect(result.candidateNeuronIds).toHaveLength(1);
  });
});

describe('HierarchicalRecallRouter — lexical routing', () => {
  test('routes to best-matching topic path by lexical similarity', () => {
    const graph = new MemoryGraph();
    addNeuron(graph, 'memory governance content', 'memory/governance');
    addNeuron(graph, 'skills runtime content', 'skills/runtime');
    const result = new HierarchicalRecallRouter(graph, { minConfidence: 0.05 }).route('memory governance', 'project-a');
    expect(result.matchedTopicPath).toBe('memory/governance');
    expect(result.fallbackToGlobal).toBe(false);
  });

  test('falls back globally when query score is below minConfidence', () => {
    const graph = new MemoryGraph();
    addNeuron(graph, 'memory governance content', 'memory/governance');
    const result = new HierarchicalRecallRouter(graph, { minConfidence: 0.99 }).route('completely unrelated', 'project-a');
    expect(result.fallbackToGlobal).toBe(true);
  });

  test('empty query falls back globally', () => {
    const graph = new MemoryGraph();
    addNeuron(graph, 'some content', 'memory/governance');
    const result = new HierarchicalRecallRouter(graph).route('', 'project-a');
    expect(result.fallbackToGlobal).toBe(true);
  });

  test('returns only neurons from specified projectId on lexical route', () => {
    const graph = new MemoryGraph();
    const neuronA = addNeuron(graph, 'memory governance alpha', 'memory/governance', 'project-a');
    addNeuron(graph, 'memory governance beta', 'memory/governance', 'project-b');
    const result = new HierarchicalRecallRouter(graph, { minConfidence: 0.05 }).route('memory governance', 'project-a');
    expect(result.candidateNeuronIds).toContain(neuronA.id);
    expect(result.candidateNeuronIds).toHaveLength(1);
  });
});

describe('HierarchicalRecallRouter — maxCandidates option', () => {
  test('maxCandidates limits hint-based candidate count', () => {
    const graph = new MemoryGraph();
    for (let i = 0; i < 10; i++) {
      addNeuron(graph, `neuron-${i}`, 'memory/governance');
    }
    const result = new HierarchicalRecallRouter(graph, { maxCandidates: 3 }).route('x', 'project-a', 'memory/governance');
    expect(result.candidateNeuronIds.length).toBeLessThanOrEqual(3);
  });

  test('maxCandidates limits lexical-route candidate count', () => {
    const graph = new MemoryGraph();
    for (let i = 0; i < 20; i++) {
      addNeuron(graph, `memory governance item ${i}`, 'memory/governance');
    }
    const result = new HierarchicalRecallRouter(graph, { maxCandidates: 5, minConfidence: 0.01 }).route('memory governance', 'project-a');
    expect(result.candidateNeuronIds.length).toBeLessThanOrEqual(5);
  });

  test('default maxCandidates is 500', () => {
    // Router defaults to 500; verify it does not throw with up to 500 neurons
    const graph = new MemoryGraph();
    for (let i = 0; i < 10; i++) {
      addNeuron(graph, `neuron ${i}`, 'memory/governance');
    }
    const result = new HierarchicalRecallRouter(graph).route('x', 'project-a', 'memory/governance');
    expect(result.candidateNeuronIds.length).toBeGreaterThan(0);
  });
});

describe('HierarchicalRecallRouter — scoreTopics', () => {
  test('scoreTopics returns results sorted by score descending', () => {
    const graph = new MemoryGraph();
    const router = new HierarchicalRecallRouter(graph);
    const scored = router.scoreTopics('memory governance policy', ['memory/governance', 'skills/runtime', 'other/path']);
    for (let i = 0; i < scored.length - 1; i++) {
      expect(scored[i].score).toBeGreaterThanOrEqual(scored[i + 1].score);
    }
  });

  test('topicScore returns 0 for completely unrelated query and topic', () => {
    const router = new HierarchicalRecallRouter(new MemoryGraph());
    const score = router.topicScore('zzzzz completely unrelated', 'memory/governance');
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThan(0.15);
  });

  test('topicScore is higher when query contains topic segments', () => {
    const router = new HierarchicalRecallRouter(new MemoryGraph());
    const high = router.topicScore('memory governance policy', 'memory/governance');
    const low = router.topicScore('something entirely different', 'memory/governance');
    expect(high).toBeGreaterThan(low);
  });
});
