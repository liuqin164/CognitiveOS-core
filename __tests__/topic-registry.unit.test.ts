import { describe, expect, test } from 'bun:test';
import { MemoryGraph } from '../src/core/MemoryGraph.js';
import { NeuronFactory } from '../src/core/Neuron.js';
import { TopicClassifier } from '../src/recall/TopicClassifier.js';
import { TopicRegistry } from '../src/recall/TopicRegistry.js';

function addNeuron(graph: MemoryGraph, content: string, topicPath?: string, projectId = 'project-a'): void {
  const now = Date.now();
  graph.addNeuron(NeuronFactory.create(content, graph.getLatestNeuronSelfHash(projectId) || 'genesis', { T: now, S: [0, 0, 0], V: [] }, {
    projectId,
    topicPath,
    type: 'chat',
    createdAt: now,
    updatedAt: now,
    status: 'active',
    tags: [],
    confidence: 1
  }));
}

describe('TopicRegistry', () => {
  test('first getTopicPaths returns current database content', () => {
    const graph = new MemoryGraph();
    addNeuron(graph, 'seed', 'memory/governance');
    expect(new TopicRegistry(graph).getTopicPaths('project-a')).toEqual(['memory/governance']);
  });

  test('cached getTopicPaths stays stable until invalidate', () => {
    const graph = new MemoryGraph();
    const registry = new TopicRegistry(graph);
    addNeuron(graph, 'seed', 'memory/governance');
    expect(registry.getTopicPaths('project-a')).toEqual(['memory/governance']);
    addNeuron(graph, 'seed', 'skills/runtime');
    expect(registry.getTopicPaths('project-a')).toEqual(['memory/governance']);
  });

  test('invalidate refreshes topic paths after new writes', () => {
    const graph = new MemoryGraph();
    const registry = new TopicRegistry(graph);
    addNeuron(graph, 'seed', 'memory/governance');
    registry.getTopicPaths('project-a');
    addNeuron(graph, 'seed', 'skills/runtime');
    registry.invalidate('project-a');
    expect(registry.getTopicPaths('project-a')).toEqual(['memory/governance', 'skills/runtime']);
  });

  test('different projectId caches are independent', () => {
    const graph = new MemoryGraph();
    const registry = new TopicRegistry(graph);
    addNeuron(graph, 'a', 'memory/governance', 'project-a');
    addNeuron(graph, 'b', 'skills/runtime', 'project-b');
    expect(registry.getTopicPaths('project-a')).toEqual(['memory/governance']);
    expect(registry.getTopicPaths('project-b')).toEqual(['skills/runtime']);
  });

  test('global cache is invalidated by project writes', () => {
    const graph = new MemoryGraph();
    const registry = new TopicRegistry(graph);
    addNeuron(graph, 'seed', 'memory/governance');
    registry.getTopicPaths();
    addNeuron(graph, 'seed', 'skills/runtime');
    registry.invalidate('project-a');
    expect(registry.getTopicPaths()).toEqual(['memory/governance', 'skills/runtime']);
  });

  test('TopicClassifier with registry matches direct memoryGraph classification', () => {
    const graph = new MemoryGraph();
    addNeuron(graph, 'seed', 'memory/governance');
    const direct = new TopicClassifier(graph).classify('memory governance', 'project-a');
    const cached = new TopicClassifier(graph, {}, new TopicRegistry(graph)).classify('memory governance', 'project-a');
    expect(cached).toEqual(direct);
  });
});
