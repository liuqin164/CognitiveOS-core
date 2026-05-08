import { describe, expect, test } from 'bun:test';
import { MemoryGraph } from '../src/core/MemoryGraph.js';
import { NeuronFactory } from '../src/core/Neuron.js';
import { TopicDecayPolicy } from '../src/recall/TopicDecayPolicy.js';
import type { Neuron } from '../src/types/index.js';

const DAY_MS = 24 * 60 * 60 * 1000;

function addNeuron(graph: MemoryGraph, topicPath: string, createdAt: number, projectId = 'project-a', tags: string[] = []): Neuron {
  const neuron = NeuronFactory.create(`content for ${topicPath} ${createdAt}`, graph.getLatestNeuronSelfHash(projectId) || 'genesis', { T: createdAt, S: [0, 0, 0], V: [] }, {
    projectId,
    topicPath,
    type: tags.includes('topic_summary') ? 'doc' : 'chat',
    createdAt,
    updatedAt: createdAt,
    status: 'active',
    confidence: 1,
    tags,
    importanceLevel: 'normal'
  });
  graph.addNeuron(neuron);
  return neuron;
}

function seed(graph: MemoryGraph, topicPath: string, count: number, ageDays: number, projectId = 'project-a'): Neuron[] {
  return Array.from({ length: count }, (_, index) => addNeuron(graph, topicPath, Date.now() - ageDays * DAY_MS - index, projectId));
}

describe('TopicDecayPolicy', () => {
  test('findStalePaths identifies topics older than threshold', () => {
    const graph = new MemoryGraph();
    seed(graph, 'archive/old', 5, 120);
    expect(new TopicDecayPolicy(graph).findStalePaths('project-a')).toEqual(['archive/old']);
  });

  test('recent topics are not stale', () => {
    const graph = new MemoryGraph();
    seed(graph, 'archive/recent', 5, 2);
    expect(new TopicDecayPolicy(graph).findStalePaths('project-a')).toEqual([]);
  });

  test('minNeuronCount filters small topics', () => {
    const graph = new MemoryGraph();
    seed(graph, 'archive/small', 4, 120);
    expect(new TopicDecayPolicy(graph).findStalePaths('project-a')).toEqual([]);
  });

  test('custom minNeuronCount can include small topics', () => {
    const graph = new MemoryGraph();
    seed(graph, 'archive/small', 2, 120);
    expect(new TopicDecayPolicy(graph, { minNeuronCount: 2 }).findStalePaths('project-a')).toEqual(['archive/small']);
  });

  test('custom staleThresholdDays is honored', () => {
    const graph = new MemoryGraph();
    seed(graph, 'archive/month', 5, 40);
    expect(new TopicDecayPolicy(graph, { staleThresholdDays: 30 }).findStalePaths('project-a')).toEqual(['archive/month']);
  });

  test('applyDecay sets stale source neurons to low importance', () => {
    const graph = new MemoryGraph();
    const neurons = seed(graph, 'archive/old', 5, 120);
    expect(new TopicDecayPolicy(graph).applyDecay('project-a')).toBe(5);
    expect(graph.getNeuron(neurons[0].id)?.metadata.importanceLevel).toBe('low');
  });

  test('applyDecay does not modify topicPath', () => {
    const graph = new MemoryGraph();
    const [neuron] = seed(graph, 'archive/old', 5, 120);
    new TopicDecayPolicy(graph).applyDecay('project-a');
    expect(graph.getNeuron(neuron.id)?.metadata.topicPath).toBe('archive/old');
  });

  test('applyDecay can target normal importance', () => {
    const graph = new MemoryGraph();
    const [neuron] = seed(graph, 'archive/old', 5, 120);
    graph.updateNeuronImportance(neuron.id, 'important');
    new TopicDecayPolicy(graph, { decayImportanceLevel: 'normal' }).applyDecay('project-a');
    expect(graph.getNeuron(neuron.id)?.metadata.importanceLevel).toBe('normal');
  });

  test('summary neurons are excluded from decay counts', () => {
    const graph = new MemoryGraph();
    seed(graph, 'archive/old', 4, 120);
    addNeuron(graph, 'archive/old', Date.now() - 120 * DAY_MS, 'project-a', ['topic_summary']);
    expect(new TopicDecayPolicy(graph).findStalePaths('project-a')).toEqual([]);
  });

  test('project filtering isolates stale paths', () => {
    const graph = new MemoryGraph();
    seed(graph, 'archive/old', 5, 120, 'project-a');
    seed(graph, 'archive/old', 5, 2, 'project-b');
    expect(new TopicDecayPolicy(graph).findStalePaths('project-b')).toEqual([]);
  });
});
