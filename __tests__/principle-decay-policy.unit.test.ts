import { describe, expect, test } from 'bun:test';
import { MemoryGraph } from '../src/core/MemoryGraph.js';
import { NeuronFactory } from '../src/core/Neuron.js';
import { PrincipleDecayPolicy } from '../src/engine/PrincipleDecayPolicy.js';

function add(graph: MemoryGraph, content: string, type: 'semantic_consolidation' | 'cross_domain_principle', options: Record<string, unknown> = {}) {
  const createdAt = Number(options.createdAt ?? Date.now());
  const neuron = NeuronFactory.create(content, graph.getLatestNeuronSelfHash('p') || 'genesis', { T: createdAt, S: [0, 0, 0], V: [] }, {
    projectId: String(options.projectId ?? 'p'),
    type,
    createdAt,
    updatedAt: Number(options.updatedAt ?? createdAt),
    status: (options.status as never) ?? 'active',
    tags: (options.tags as string[]) ?? ['topic-a'],
    importanceLevel: (options.importanceLevel as never) ?? (type === 'cross_domain_principle' ? 'permanent' : 'important'),
    lastReinforcedAt: options.lastReinforcedAt as number | undefined
  });
  graph.addNeuron(neuron);
  return neuron;
}

describe('PrincipleDecayPolicy', () => {
  test('refreshes lastReinforcedAt when semantic tags overlap', async () => {
    const g = new MemoryGraph(); const p = add(g, 'principle', 'cross_domain_principle', { lastReinforcedAt: 1, tags: ['topic-a'] }); add(g, 'semantic', 'semantic_consolidation', { createdAt: Date.now(), tags: ['topic-a'] });
    expect((await new PrincipleDecayPolicy(g).run('p')).reinforced).toBe(1);
    expect(g.getNeuron(p.id)?.metadata.lastReinforcedAt).toBeGreaterThan(1);
  });
  test('does not refresh below overlap threshold', async () => {
    const g = new MemoryGraph(); const p = add(g, 'principle', 'cross_domain_principle', { lastReinforcedAt: 10, tags: ['topic-a'] }); add(g, 'semantic', 'semantic_consolidation', { createdAt: Date.now(), tags: ['topic-b'] });
    await new PrincipleDecayPolicy(g).run('p');
    expect(g.getNeuron(p.id)?.metadata.lastReinforcedAt).toBe(10);
  });
  test('marks principle suspect when all sources are cold', async () => {
    const g = new MemoryGraph(); const s = add(g, 'semantic', 'semantic_consolidation', { status: 'cold' }); const p = add(g, 'principle', 'cross_domain_principle'); g.addSynapse(p.id, { targetId: s.id, type: 'Referenced', weight: 1 });
    expect((await new PrincipleDecayPolicy(g).run('p')).markedStale).toBe(1);
  });
  test('does not mark stale when one source remains active', async () => {
    const g = new MemoryGraph(); const a = add(g, 'a', 'semantic_consolidation', { status: 'active' }); const b = add(g, 'b', 'semantic_consolidation', { status: 'cold' }); const p = add(g, 'p', 'cross_domain_principle'); g.addSynapse(p.id, { targetId: a.id, type: 'Referenced', weight: 1 }); g.addSynapse(p.id, { targetId: b.id, type: 'Referenced', weight: 1 });
    expect((await new PrincipleDecayPolicy(g).run('p')).markedStale).toBe(0);
  });
  test('degrades permanent principle after stale window', async () => {
    const g = new MemoryGraph(); const p = add(g, 'p', 'cross_domain_principle', { lastReinforcedAt: 1 });
    expect((await new PrincipleDecayPolicy(g, { staleDaysMs: 1 }).run('p')).degraded).toBe(1);
    expect(g.getNeuron(p.id)?.metadata.importanceLevel).toBe('important');
  });
  test('does not degrade within stale window', async () => {
    const g = new MemoryGraph(); const p = add(g, 'p', 'cross_domain_principle', { lastReinforcedAt: Date.now() });
    await new PrincipleDecayPolicy(g, { staleDaysMs: 60_000 }).run('p');
    expect(g.getNeuron(p.id)?.metadata.importanceLevel).toBe('permanent');
  });
  test('important principle is not repeatedly degraded', async () => {
    const g = new MemoryGraph(); add(g, 'p', 'cross_domain_principle', { lastReinforcedAt: 1, importanceLevel: 'important' });
    expect((await new PrincipleDecayPolicy(g, { staleDaysMs: 1 }).run('p')).degraded).toBe(0);
  });
  test('returns zero counts without principles', async () => {
    const g = new MemoryGraph(); add(g, 'semantic', 'semantic_consolidation');
    expect(await new PrincipleDecayPolicy(g).run('p')).toEqual({ reinforced: 0, degraded: 0, markedStale: 0 });
  });
  test('run counts multiple actions', async () => {
    const g = new MemoryGraph(); add(g, 'old', 'cross_domain_principle', { lastReinforcedAt: 1, tags: ['x'] }); add(g, 'fresh semantic', 'semantic_consolidation', { tags: ['topic-a'] }); add(g, 'p', 'cross_domain_principle', { lastReinforcedAt: 1, tags: ['topic-a'] });
    const result = await new PrincipleDecayPolicy(g, { staleDaysMs: 1 }).run('p');
    expect(result.reinforced).toBe(1); expect(result.degraded).toBe(1);
  });
  test('is project isolated', async () => {
    const g = new MemoryGraph(); const p = add(g, 'p', 'cross_domain_principle', { projectId: 'p2', lastReinforcedAt: 1 });
    await new PrincipleDecayPolicy(g, { staleDaysMs: 1 }).run('p');
    expect(g.getNeuron(p.id)?.metadata.importanceLevel).toBe('permanent');
  });
});
