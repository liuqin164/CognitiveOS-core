import { describe, expect, test } from 'bun:test';
import { MemoryGraph } from '../src/core/MemoryGraph.js';
import { NeuronFactory } from '../src/core/Neuron.js';
import { CrossTopicTrigger } from '../src/engine/CrossTopicTrigger.js';
import { CrossTopicSynthesizer } from '../src/engine/CrossTopicSynthesizer.js';
import { OrphanCleaner } from '../src/engine/OrphanCleaner.js';
import { BrainRecall } from '../src/recall/BrainRecall.js';
import type { IterativeLLMClarifier } from '../src/routing/IterativeLLMClarifier.js';

class MockClarifier { async clarify() { return { finalAnswer: 'one cross-domain principle' }; } }

function semantic(graph: MemoryGraph, topic: string, projectId = 'p') {
  const now = Date.now();
  const n = NeuronFactory.create(`semantic ${topic}`, graph.getLatestNeuronSelfHash(projectId) || 'genesis', { T: now, S: [0, 0, 0], V: [] }, {
    projectId, topicPath: topic, type: 'semantic_consolidation', createdAt: now, updatedAt: now, status: 'active', tags: ['consolidated', `topic:${topic}`], importanceLevel: 'important', isPinned: true, stability: 1
  });
  graph.addNeuron(n); return n;
}

function deps(graph: MemoryGraph) {
  return { memoryGraph: graph, factStore: { listNeuronIdsByEntityIds: () => [], listFactsByNeuronIds: () => [], listFactsByEntityIds: () => [], listEventsByNeuronIds: () => [] }, entityStore: { findByCanonicalName: () => null, findByAlias: () => null, getEntityTimeline: () => [] }, beliefStore: { getActiveBeliefsForQuery: () => [] }, cursorStore: { listRecentUnprocessedSources: () => [] } } as unknown as ConstructorParameters<typeof BrainRecall>[0];
}

describe('CrossTopicSynthesizer', () => {
  test('trigger ignores batches below semantic threshold', () => {
    const g = new MemoryGraph(); semantic(g, 'a'); semantic(g, 'b');
    expect(new CrossTopicTrigger(g, { semanticThreshold: 3, minDistinctTopics: 2 }).findCandidateBatches('p')).toEqual([]);
  });
  test('trigger ignores batches below distinct topic threshold', () => {
    const g = new MemoryGraph(); semantic(g, 'a'); semantic(g, 'a'); semantic(g, 'a');
    expect(new CrossTopicTrigger(g, { semanticThreshold: 3, minDistinctTopics: 2 }).findCandidateBatches('p')).toEqual([]);
  });
  test('trigger enforces cooldown for same batch', () => {
    const g = new MemoryGraph(); ['a', 'b', 'c'].forEach((t) => semantic(g, t));
    const trigger = new CrossTopicTrigger(g, { semanticThreshold: 3, minDistinctTopics: 3, cooldownMs: 60_000 });
    expect(trigger.findCandidateBatches('p')).toHaveLength(1);
    expect(trigger.findCandidateBatches('p')).toHaveLength(0);
  });
  test('synthesizer creates cross_domain_principle neuron', async () => {
    const g = new MemoryGraph(); ['a', 'b', 'c'].forEach((t) => semantic(g, t));
    await new CrossTopicSynthesizer(g, new CrossTopicTrigger(g, { semanticThreshold: 3, minDistinctTopics: 3 }), new MockClarifier() as unknown as IterativeLLMClarifier).run('p');
    expect(g.getAllNeurons().some((n) => n.metadata.type === 'cross_domain_principle')).toBe(true);
  });
  test('created principle is permanent', async () => {
    const g = new MemoryGraph(); ['a', 'b', 'c'].forEach((t) => semantic(g, t));
    await new CrossTopicSynthesizer(g, new CrossTopicTrigger(g, { semanticThreshold: 3, minDistinctTopics: 3 }), new MockClarifier() as unknown as IterativeLLMClarifier).run('p');
    expect(g.getAllNeurons().find((n) => n.metadata.type === 'cross_domain_principle')?.metadata.importanceLevel).toBe('permanent');
  });
  test('created principle references source semantic neurons', async () => {
    const g = new MemoryGraph(); ['a', 'b', 'c'].forEach((t) => semantic(g, t));
    await new CrossTopicSynthesizer(g, new CrossTopicTrigger(g, { semanticThreshold: 3, minDistinctTopics: 3 }), new MockClarifier() as unknown as IterativeLLMClarifier).run('p');
    const p = g.getAllNeurons().find((n) => n.metadata.type === 'cross_domain_principle')!;
    expect(g.getSynapses(p.id).filter((s) => s.type === 'Referenced')).toHaveLength(3);
  });
  test('created principle includes cross_domain tag', async () => {
    const g = new MemoryGraph(); ['a', 'b', 'c'].forEach((t) => semantic(g, t));
    await new CrossTopicSynthesizer(g, new CrossTopicTrigger(g, { semanticThreshold: 3, minDistinctTopics: 3 }), new MockClarifier() as unknown as IterativeLLMClarifier).run('p');
    expect(g.getAllNeurons().find((n) => n.metadata.type === 'cross_domain_principle')?.metadata.tags).toContain('cross_domain');
  });
  test('BrainRecall prepends cross-domain before semantic', async () => {
    const g = new MemoryGraph(); ['memory/a', 'memory/b', 'memory/c'].forEach((t) => semantic(g, t));
    await new CrossTopicSynthesizer(g, new CrossTopicTrigger(g, { semanticThreshold: 3, minDistinctTopics: 3 }), new MockClarifier() as unknown as IterativeLLMClarifier).run('p');
    expect(new BrainRecall(deps(g)).recall('semantic', { projectId: 'p' }).rawEvidence[0]?.metadata.type).toBe('cross_domain_principle');
  });
  test('BrainRecall behavior stays baseline without cross-domain principle', () => {
    const g = new MemoryGraph(); semantic(g, 'a');
    expect(new BrainRecall(deps(g)).recall('semantic', { projectId: 'p' }).rawEvidence[0]?.metadata.type).toBe('semantic_consolidation');
  });
  test('OrphanCleaner exempts cross-domain principles', async () => {
    const g = new MemoryGraph(); ['a', 'b', 'c'].forEach((t) => semantic(g, t));
    await new CrossTopicSynthesizer(g, new CrossTopicTrigger(g, { semanticThreshold: 3, minDistinctTopics: 3 }), new MockClarifier() as unknown as IterativeLLMClarifier).run('p');
    expect((await new OrphanCleaner(g, { orphanAgeMs: 0 }).run('p')).orphansMarked).toBe(0);
  });
  test('OrphanCleaner exempts legacy skill neurons without declarative links', async () => {
    const g = new MemoryGraph();
    const now = Date.now() - 10_000;
    const skill = NeuronFactory.create('legacy skill', 'genesis', { T: now, S: [0, 0, 0], V: [] }, {
      projectId: 'p',
      type: 'skill',
      createdAt: now,
      updatedAt: now,
      status: 'active',
      importanceLevel: 'normal'
    });
    g.addNeuron(skill);
    expect((await new OrphanCleaner(g, { orphanAgeMs: 0 }).run('p')).orphansMarked).toBe(0);
    expect(g.getNeuron(skill.id)?.metadata.status).toBe('active');
  });
  test('run returns created count', async () => {
    const g = new MemoryGraph(); ['a', 'b', 'c'].forEach((t) => semantic(g, t));
    expect(await new CrossTopicSynthesizer(g, new CrossTopicTrigger(g, { semanticThreshold: 3, minDistinctTopics: 3 }), new MockClarifier() as unknown as IterativeLLMClarifier).run('p')).toEqual({ principleNeuronsCreated: 1 });
  });
  test('trigger is project isolated', () => {
    const g = new MemoryGraph(); ['a', 'b', 'c'].forEach((t) => semantic(g, t, 'p2'));
    expect(new CrossTopicTrigger(g, { semanticThreshold: 3, minDistinctTopics: 3 }).findCandidateBatches('p')).toEqual([]);
  });
});
