import { describe, expect, test } from 'bun:test';
import { MemoryGraph } from '../src/core/MemoryGraph.js';
import { NeuronFactory } from '../src/core/Neuron.js';
import { BrainRecall } from '../src/recall/BrainRecall.js';
import { HierarchicalRecallRouter } from '../src/recall/HierarchicalRecallRouter.js';
import { TopicFilter, VectorCandidateFilter } from '../src/recall/VectorCandidateFilter.js';
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

function recallDeps(graph: MemoryGraph, extras: Record<string, unknown> = {}) {
  return {
    memoryGraph: graph,
    factStore: {
      listNeuronIdsByEntityIds: () => [],
      listFactsByNeuronIds: () => [],
      listFactsByEntityIds: () => [],
      listEventsByNeuronIds: () => []
    },
    entityStore: {
      findByCanonicalName: () => null,
      findByAlias: () => null,
      findByEntityId: () => null,
      getEntityTimeline: () => []
    },
    beliefStore: { getActiveBeliefsForQuery: () => [] },
    cursorStore: { listRecentUnprocessedSources: () => [] },
    ...extras
  } as unknown as ConstructorParameters<typeof BrainRecall>[0];
}

describe('BrainRecall — backward compatibility without hierarchicalRouter', () => {
  test('topicRouteInfo is undefined when no hierarchicalRouter is provided', () => {
    const graph = new MemoryGraph();
    addNeuron(graph, 'some memory content', 'memory/governance');
    const recall = new BrainRecall(recallDeps(graph));
    const result = recall.recall('some memory', { projectId: 'project-a', includeRawEvidence: true });
    expect(result.topicRouteInfo).toBeUndefined();
  });

  test('recall still returns rawEvidence without hierarchicalRouter', () => {
    const graph = new MemoryGraph();
    const item = addNeuron(graph, 'memory hygiene content');
    const recall = new BrainRecall(recallDeps(graph));
    const result = recall.recall('memory hygiene', { projectId: 'project-a', includeRawEvidence: true });
    // FTS5 may or may not pick it up; just verify no crash and result has expected shape
    expect(result.query).toBe('memory hygiene');
    expect(Array.isArray(result.rawEvidence)).toBe(true);
  });

  test('recall without hierarchicalRouter does not crash when topicPath option is passed', () => {
    const graph = new MemoryGraph();
    addNeuron(graph, 'memory governance content', 'memory/governance');
    const recall = new BrainRecall(recallDeps(graph));
    // topicPath option with no router — should not throw, topicRouteInfo is undefined
    expect(() => recall.recall('memory governance', { projectId: 'project-a', topicPath: 'memory/governance' })).not.toThrow();
    const result = recall.recall('memory governance', { projectId: 'project-a', topicPath: 'memory/governance' });
    expect(result.topicRouteInfo).toBeUndefined();
  });
});

describe('BrainRecall — with hierarchicalRouter, topic filtering', () => {
  test('rawEvidence excludes out-of-topic neurons when topicPath is provided', () => {
    const graph = new MemoryGraph();
    const inTopic = addNeuron(graph, 'memory governance contradiction resolver', 'memory/governance');
    addNeuron(graph, 'skills runtime procedure executor', 'skills/runtime');
    const recall = new BrainRecall(recallDeps(graph, {
      hierarchicalRouter: new HierarchicalRecallRouter(graph)
    }));
    const result = recall.recall('memory governance contradiction', {
      projectId: 'project-a',
      topicPath: 'memory/governance',
      includeRawEvidence: true
    });
    const ids = result.rawEvidence.map((n) => n.id);
    expect(ids).toContain(inTopic.id);
    // skills/runtime neuron must not bleed into memory/governance results
    const skillsNeuron = graph.getNeuronIdsByTopicPrefix('skills/runtime', 'project-a');
    for (const sid of skillsNeuron) {
      expect(ids).not.toContain(sid);
    }
  });

  test('topicRouteInfo is populated when hierarchicalRouter is provided', () => {
    const graph = new MemoryGraph();
    addNeuron(graph, 'memory governance item', 'memory/governance');
    const recall = new BrainRecall(recallDeps(graph, {
      hierarchicalRouter: new HierarchicalRecallRouter(graph)
    }));
    const result = recall.recall('memory governance', {
      projectId: 'project-a',
      topicPath: 'memory/governance'
    });
    expect(result.topicRouteInfo).toBeDefined();
    expect(result.topicRouteInfo?.matchedTopicPath).toBe('memory/governance');
  });

  test('falls back to global when topicPath has no matching neurons', () => {
    const graph = new MemoryGraph();
    const globalItem = addNeuron(graph, 'memory governance global fallback', 'memory/governance');
    const recall = new BrainRecall(recallDeps(graph, {
      hierarchicalRouter: new HierarchicalRecallRouter(graph)
    }));
    const result = recall.recall('memory governance global fallback', {
      projectId: 'project-a',
      topicPath: 'does/not/exist',
      includeRawEvidence: true
    });
    expect(result.topicRouteInfo?.fallbackToGlobal).toBe(true);
    // Global fallback means the neuron from memory/governance may appear
    expect(result.rawEvidence.map((n) => n.id)).toContain(globalItem.id);
  });

  test('lexical routing picks correct topic when no hint given', () => {
    const graph = new MemoryGraph();
    const inTopic = addNeuron(graph, 'memory governance policy document', 'memory/governance');
    addNeuron(graph, 'skills runtime executor', 'skills/runtime');
    const recall = new BrainRecall(recallDeps(graph, {
      hierarchicalRouter: new HierarchicalRecallRouter(graph, { minConfidence: 0.05 })
    }));
    const result = recall.recall('memory governance policy', {
      projectId: 'project-a',
      includeRawEvidence: true
    });
    expect(result.topicRouteInfo?.matchedTopicPath).toBe('memory/governance');
    expect(result.rawEvidence.map((n) => n.id)).toContain(inTopic.id);
  });

  test('cross-project: recall scoped to projectId does not include other project neurons', () => {
    const graph = new MemoryGraph();
    const neuronA = addNeuron(graph, 'memory governance project alpha', 'memory/governance', 'project-a');
    addNeuron(graph, 'memory governance project beta', 'memory/governance', 'project-b');
    const recall = new BrainRecall(recallDeps(graph, {
      hierarchicalRouter: new HierarchicalRecallRouter(graph)
    }));
    const result = recall.recall('memory governance', {
      projectId: 'project-a',
      topicPath: 'memory/governance',
      includeRawEvidence: true
    });
    const ids = result.rawEvidence.map((n) => n.id);
    expect(ids).toContain(neuronA.id);
    const projectBIds = graph.getNeuronIdsByTopicPrefix('memory/governance', 'project-b');
    for (const bid of projectBIds) {
      expect(ids).not.toContain(bid);
    }
  });
});

describe('BrainRecall — VectorCandidateFilter with TopicFilter', () => {
  test('vector results filtered to topic scope when TopicFilter is in chain', () => {
    const graph = new MemoryGraph();
    const topicNeuron = addNeuron(graph, 'vector memory hit', 'memory/governance');
    const otherNeuron = addNeuron(graph, 'vector other hit', 'skills/runtime');
    const recall = new BrainRecall(recallDeps(graph, {
      hierarchicalRouter: new HierarchicalRecallRouter(graph),
      vectorSearchFn: () => [topicNeuron.id, otherNeuron.id],
      vectorCandidateFilter: new VectorCandidateFilter([new TopicFilter(graph)])
    }));
    const result = recall.recall('unmatched query zzz', {
      projectId: 'project-a',
      topicPath: 'memory/governance',
      includeRawEvidence: true,
      limit: 10
    });
    const ids = result.rawEvidence.map((n) => n.id);
    expect(ids).toContain(topicNeuron.id);
    expect(ids).not.toContain(otherNeuron.id);
  });
});
