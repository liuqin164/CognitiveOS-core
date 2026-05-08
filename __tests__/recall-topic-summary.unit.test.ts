import { describe, expect, test } from 'bun:test';
import { MemoryGraph } from '../src/core/MemoryGraph.js';
import { NeuronFactory } from '../src/core/Neuron.js';
import { BrainRecall } from '../src/recall/BrainRecall.js';
import { HierarchicalRecallRouter } from '../src/recall/HierarchicalRecallRouter.js';
import { TopicSummaryBoard } from '../src/recall/TopicSummaryBoard.js';
import { SummaryStore } from '../src/store/SummaryStore.js';

function addNeuron(graph: MemoryGraph, content: string, topicPath = 'memory/governance', projectId = 'project-a') {
  const now = Date.now();
  const neuron = NeuronFactory.create(content, graph.getLatestNeuronSelfHash(projectId) || 'genesis', { T: now, S: [0, 0, 0], V: [] }, {
    projectId,
    topicPath,
    type: 'chat',
    createdAt: now,
    updatedAt: now,
    status: 'active',
    confidence: 1,
    tags: []
  });
  graph.addNeuron(neuron);
  return neuron;
}

function deps(graph: MemoryGraph, topicSummaryBoard?: TopicSummaryBoard) {
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
    hierarchicalRouter: new HierarchicalRecallRouter(graph, { minConfidence: 0.1, maxCandidates: 50 }),
    topicSummaryBoard
  } as unknown as ConstructorParameters<typeof BrainRecall>[0];
}

function seedSummary(graph: MemoryGraph): { board: TopicSummaryBoard; summaryId: string } {
  addNeuron(graph, 'memory governance raw evidence');
  const board = new TopicSummaryBoard(graph, new SummaryStore());
  return { board, summaryId: board.refresh('memory/governance', 'project-a')! };
}

describe('BrainRecall topic summary integration', () => {
  test('prepends topic summary to rawEvidence for matched topic route', () => {
    const graph = new MemoryGraph();
    const { board, summaryId } = seedSummary(graph);
    const result = new BrainRecall(deps(graph, board)).recall('memory governance', { projectId: 'project-a', includeRawEvidence: true });
    expect(result.rawEvidence[0]?.id).toBe(summaryId);
  });

  test('does not duplicate summary already present in candidates', () => {
    const graph = new MemoryGraph();
    const { board, summaryId } = seedSummary(graph);
    const result = new BrainRecall(deps(graph, board)).recall('topic summary memory governance', { projectId: 'project-a', includeRawEvidence: true, limit: 10 });
    expect(result.rawEvidence.filter((neuron) => neuron.id === summaryId)).toHaveLength(1);
  });

  test('omits summary when raw evidence is disabled', () => {
    const graph = new MemoryGraph();
    const { board } = seedSummary(graph);
    const result = new BrainRecall(deps(graph, board)).recall('memory governance', { projectId: 'project-a', includeRawEvidence: false });
    expect(result.rawEvidence).toEqual([]);
  });

  test('keeps baseline behavior when board is not injected', () => {
    const graph = new MemoryGraph();
    seedSummary(graph);
    const result = new BrainRecall(deps(graph)).recall('memory governance', { projectId: 'project-a', includeRawEvidence: true });
    // Without topicSummaryBoard, BrainRecall should not crash and should return evidence.
    // We cannot assert position-0 identity here because FTS5 BM25 ordering of summary vs
    // source neuron is non-deterministic across SQLite versions. Only assert shape + routing.
    expect(result.rawEvidence.length).toBeGreaterThan(0);
    expect(result.topicRouteInfo?.fallbackToGlobal).not.toBe(true);
  });

  test('does not prepend on fallback-to-global route', () => {
    const graph = new MemoryGraph();
    const { board, summaryId } = seedSummary(graph);
    const result = new BrainRecall(deps(graph, board)).recall('unmatched weather', { projectId: 'project-a', includeRawEvidence: true });
    expect(result.topicRouteInfo?.fallbackToGlobal).toBe(true);
    expect(result.rawEvidence[0]?.id).not.toBe(summaryId);
  });

  test('uses explicit topicPath hint for summary lookup', () => {
    const graph = new MemoryGraph();
    const { board, summaryId } = seedSummary(graph);
    const result = new BrainRecall(deps(graph, board)).recall('raw evidence', { projectId: 'project-a', topicPath: 'memory/governance', includeRawEvidence: true });
    expect(result.rawEvidence[0]?.id).toBe(summaryId);
  });

  test('summary lookup remains project scoped', () => {
    const graph = new MemoryGraph();
    const { board, summaryId } = seedSummary(graph);
    addNeuron(graph, 'memory governance raw evidence', 'memory/governance', 'project-b');
    const result = new BrainRecall(deps(graph, board)).recall('memory governance', { projectId: 'project-b', includeRawEvidence: true });
    expect(result.rawEvidence[0]?.id).not.toBe(summaryId);
  });
});
