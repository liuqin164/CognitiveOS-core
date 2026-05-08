import { describe, expect, test } from 'bun:test';
import { MemoryGraph } from '../src/core/MemoryGraph.js';
import { NeuronFactory } from '../src/core/Neuron.js';
import { BrainRecall } from '../src/recall/BrainRecall.js';
import { HierarchicalRecallRouter } from '../src/recall/HierarchicalRecallRouter.js';
import type { IterativeLLMClarifier } from '../src/routing/IterativeLLMClarifier.js';
import { ConsolidationTrigger } from '../src/engine/ConsolidationTrigger.js';
import { EpisodicSemanticDistiller } from '../src/engine/EpisodicSemanticDistiller.js';
import { MemoryConsolidationEngine } from '../src/engine/MemoryConsolidationEngine.js';

class MockClarifier {
  constructor(private readonly output: string) {}
  async clarify(): Promise<{ finalAnswer: string }> {
    return { finalAnswer: this.output };
  }
}

function addNeuron(graph: MemoryGraph, content: string, topicPath = 'work/code', projectId = 'project-a', createdAt = Date.now()) {
  const neuron = NeuronFactory.create(content, graph.getLatestNeuronSelfHash(projectId) || 'genesis', { T: createdAt, S: [0, 0, 0], V: [] }, {
    projectId,
    topicPath,
    type: 'chat',
    createdAt,
    updatedAt: createdAt,
    status: 'active',
    tags: ['work']
  });
  graph.addNeuron(neuron);
  return neuron;
}

function deps(graph: MemoryGraph) {
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
      getEntityTimeline: () => []
    },
    beliefStore: { getActiveBeliefsForQuery: () => [] },
    cursorStore: { listRecentUnprocessedSources: () => [] },
    hierarchicalRouter: new HierarchicalRecallRouter(graph, { minConfidence: 0.1, maxCandidates: 50 })
  } as unknown as ConstructorParameters<typeof BrainRecall>[0];
}

describe('MemoryConsolidationEngine', () => {
  test('trigger identifies topic that reaches threshold', () => {
    const graph = new MemoryGraph();
    for (let i = 0; i < 3; i++) addNeuron(graph, `episode ${i}`);
    expect(new ConsolidationTrigger(graph, { episodicThreshold: 3 }).findCandidates('project-a')[0]?.topicPath).toBe('work/code');
  });

  test('trigger ignores topics below threshold', () => {
    const graph = new MemoryGraph();
    addNeuron(graph, 'one');
    expect(new ConsolidationTrigger(graph, { episodicThreshold: 2 }).findCandidates('project-a')).toEqual([]);
  });

  test('trigger respects cooldown after semantic consolidation', async () => {
    const graph = new MemoryGraph();
    const ids = Array.from({ length: 5 }, (_, i) => addNeuron(graph, `episode ${i}`).id);
    await new EpisodicSemanticDistiller(graph, new MockClarifier('principle') as unknown as IterativeLLMClarifier).distill({ projectId: 'project-a', topicPath: 'work/code', episodicNeuronIds: ids });
    expect(new ConsolidationTrigger(graph, { episodicThreshold: 5, cooldownMs: 60_000 }).findCandidates('project-a')).toEqual([]);
  });

  test('distiller returns null when batch is too small', async () => {
    const graph = new MemoryGraph();
    const id = addNeuron(graph, 'episode').id;
    const result = await new EpisodicSemanticDistiller(graph, new MockClarifier('principle') as unknown as IterativeLLMClarifier).distill({ projectId: 'project-a', episodicNeuronIds: [id] });
    expect(result).toBeNull();
  });

  test('distill creates semantic_consolidation neuron', async () => {
    const graph = new MemoryGraph();
    const ids = Array.from({ length: 5 }, (_, i) => addNeuron(graph, `episode ${i}`).id);
    const result = await new EpisodicSemanticDistiller(graph, new MockClarifier('durable principle') as unknown as IterativeLLMClarifier).distill({ projectId: 'project-a', topicPath: 'work/code', episodicNeuronIds: ids });
    expect(graph.getNeuron(result!.semanticNeuronId)?.metadata.type).toBe('semantic_consolidation');
  });

  test('distill marks semantic neuron important and stable', async () => {
    const graph = new MemoryGraph();
    const ids = Array.from({ length: 5 }, (_, i) => addNeuron(graph, `episode ${i}`).id);
    const result = await new EpisodicSemanticDistiller(graph, new MockClarifier('durable principle') as unknown as IterativeLLMClarifier).distill({ projectId: 'project-a', topicPath: 'work/code', episodicNeuronIds: ids });
    const neuron = graph.getNeuron(result!.semanticNeuronId)!;
    expect(neuron.metadata.importanceLevel).toBe('important');
    expect(neuron.metadata.stability).toBe(1);
  });

  test('distill links semantic neuron to all source episodes with Referenced synapses', async () => {
    const graph = new MemoryGraph();
    const ids = Array.from({ length: 5 }, (_, i) => addNeuron(graph, `episode ${i}`).id);
    const result = await new EpisodicSemanticDistiller(graph, new MockClarifier('principle') as unknown as IterativeLLMClarifier).distill({ projectId: 'project-a', topicPath: 'work/code', episodicNeuronIds: ids });
    expect(graph.getSynapses(result!.semanticNeuronId).filter((s) => s.type === 'Referenced')).toHaveLength(5);
  });

  test('engine run returns created semantic count without refreshing user model', async () => {
    const graph = new MemoryGraph();
    Array.from({ length: 5 }, (_, i) => addNeuron(graph, `episode ${i}`));
    const engine = new MemoryConsolidationEngine(
      new ConsolidationTrigger(graph, { episodicThreshold: 5 }),
      new EpisodicSemanticDistiller(graph, new MockClarifier('principle') as unknown as IterativeLLMClarifier)
    );
    expect(await engine.run('project-a')).toEqual({ semanticNeuronsCreated: 1 });
  });

  test('BrainRecall prepends semantic consolidation when present', async () => {
    const graph = new MemoryGraph();
    const ids = Array.from({ length: 5 }, (_, i) => addNeuron(graph, `memory governance episode ${i}`, 'memory/governance').id);
    const result = await new EpisodicSemanticDistiller(graph, new MockClarifier('semantic principle') as unknown as IterativeLLMClarifier).distill({ projectId: 'project-a', topicPath: 'memory/governance', episodicNeuronIds: ids });
    const recall = new BrainRecall(deps(graph)).recall('memory governance', { projectId: 'project-a', includeRawEvidence: true });
    expect(recall.rawEvidence[0]?.id).toBe(result!.semanticNeuronId);
  });

  test('BrainRecall baseline raw evidence remains non-semantic when no consolidation exists', () => {
    const graph = new MemoryGraph();
    addNeuron(graph, 'memory governance episode', 'memory/governance');
    const recall = new BrainRecall(deps(graph)).recall('memory governance', { projectId: 'project-a', includeRawEvidence: true });
    expect(recall.rawEvidence[0]?.metadata.type).toBe('chat');
  });

  test('semantic consolidation is project isolated in BrainRecall', async () => {
    const graph = new MemoryGraph();
    const ids = Array.from({ length: 5 }, (_, i) => addNeuron(graph, `alpha episode ${i}`, 'memory/governance', 'project-a').id);
    const semantic = await new EpisodicSemanticDistiller(graph, new MockClarifier('alpha principle') as unknown as IterativeLLMClarifier).distill({ projectId: 'project-a', topicPath: 'memory/governance', episodicNeuronIds: ids });
    addNeuron(graph, 'beta memory governance', 'memory/governance', 'project-b');
    const recall = new BrainRecall(deps(graph)).recall('memory governance', { projectId: 'project-b', includeRawEvidence: true });
    expect(recall.rawEvidence.map((n) => n.id)).not.toContain(semantic!.semanticNeuronId);
  });

  test('trigger groups different topics independently', () => {
    const graph = new MemoryGraph();
    for (let i = 0; i < 3; i++) addNeuron(graph, `a ${i}`, 'a');
    for (let i = 0; i < 2; i++) addNeuron(graph, `b ${i}`, 'b');
    expect(new ConsolidationTrigger(graph, { episodicThreshold: 3 }).findCandidates('project-a').map((c) => c.topicPath)).toEqual(['a']);
  });
});
