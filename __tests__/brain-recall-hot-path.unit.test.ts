import { describe, expect, test } from 'bun:test';
import { MemoryGraph } from '../src/core/MemoryGraph.js';
import { NeuronFactory } from '../src/core/Neuron.js';
import { BrainRecall } from '../src/recall/BrainRecall.js';

function addNeuron(
  graph: MemoryGraph,
  content: string,
  type: 'chat' | 'semantic_consolidation' | 'cross_domain_principle',
  createdAt: number,
  topicPath = 'memory/governance',
  projectId = 'project-a'
) {
  const neuron = NeuronFactory.create(
    content,
    graph.getLatestNeuronSelfHash(projectId) || 'genesis',
    { T: createdAt, S: [0, 0, 0], V: [] },
    {
      projectId,
      topicPath,
      type,
      createdAt,
      updatedAt: createdAt,
      status: 'active',
      tags: [`topic:${topicPath}`]
    }
  );
  graph.addNeuron(neuron);
  return neuron;
}

function recallDeps(graph: MemoryGraph) {
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
    cursorStore: { listRecentUnprocessedSources: () => [] }
  } as unknown as ConstructorParameters<typeof BrainRecall>[0];
}

describe('BrainRecall hot path', () => {
  test('prepends durable memory neurons without scanning all neurons', () => {
    const graph = new MemoryGraph();
    const now = Date.now();
    addNeuron(graph, 'memory governance raw episode', 'chat', now - 3000);
    const semantic = addNeuron(graph, 'semantic memory governance summary', 'semantic_consolidation', now - 2000);
    const principle = addNeuron(graph, 'cross-domain memory governance principle', 'cross_domain_principle', now - 1000);

    (graph as unknown as { getAllNeurons: () => never }).getAllNeurons = () => {
      throw new Error('BrainRecall hot path must not call getAllNeurons');
    };

    const result = new BrainRecall(recallDeps(graph)).recall('memory governance', {
      projectId: 'project-a',
      topicPath: 'memory/governance',
      includeRawEvidence: true
    });

    expect(result.rawEvidence.map((neuron) => neuron.id).slice(0, 2)).toEqual([
      principle.id,
      semantic.id
    ]);
  });
});
