import { describe, expect, test } from 'bun:test';
import { MemoryGraph } from '../src/core/MemoryGraph.js';
import { Metabolism } from '../src/core/Metabolism.js';
import { NeuronFactory } from '../src/core/Neuron.js';

describe('Metabolism pinned neurons', () => {
  test('keeps pinned neurons active and restores vector index membership', () => {
    const graph = new MemoryGraph(':memory:');
    const createdAt = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const neuron = NeuronFactory.create('must stay hot', 'genesis', {
      T: createdAt,
      S: [0, 0, 0],
      V: [0.1, 0.2, 0.3]
    }, {
      type: 'chat',
      createdAt,
      status: 'archived',
      stability: 9999,
      repetitions: 0,
      importanceLevel: 'permanent',
      isPinned: true
    });
    graph.addNeuron(neuron);

    const added: string[] = [];
    const removed: string[] = [];
    const metabolism = new Metabolism(graph, {
      addVector(id: string) { added.push(id); },
      removePoint(id: string) { removed.push(id); },
      search() { return []; }
    });

    (metabolism as any).batchTransitionStates();

    expect(graph.getNeuron(neuron.id)?.metadata.status).toBe('active');
    expect(added).toContain(neuron.id);
    expect(removed).not.toContain(neuron.id);
  });
});
