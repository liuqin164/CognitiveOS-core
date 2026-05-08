import { describe, expect, test } from 'bun:test';
import { MemoryGraph } from '../src/core/MemoryGraph.js';
import { NeuronFactory } from '../src/core/Neuron.js';
import { TopicClassifier } from '../src/recall/TopicClassifier.js';
import { Embedder } from '../src/store/Embedder.js';
import type { Neuron } from '../src/types/index.js';

class KeywordEmbedder extends Embedder {
  async warmup(): Promise<void> {
    this.isLoaded = true;
    this.isWarmedUp = true;
  }

  async embed(text: string): Promise<number[]> {
    if (/atlas|vector|semantic/i.test(text)) return [1, 0, 0];
    if (/ledger|budget|finance/i.test(text)) return [0, 1, 0];
    return [0, 0, 1];
  }
}

function addNeuron(graph: MemoryGraph, content: string, topicPath: string, vector: number[], createdAt = Date.now(), tags: string[] = []): Neuron {
  const neuron = NeuronFactory.create(content, graph.getLatestNeuronSelfHash('project-a') || 'genesis', { T: createdAt, S: [0, 0, 0], V: vector }, {
    projectId: 'project-a',
    topicPath,
    type: tags.includes('topic_summary') ? 'doc' : 'chat',
    createdAt,
    updatedAt: createdAt,
    status: 'active',
    confidence: 1,
    tags
  });
  graph.addNeuron(neuron);
  return neuron;
}

describe('TopicClassifier embedding strategy', () => {
  test('classifyAsync uses embedding when lexical confidence misses', async () => {
    const graph = new MemoryGraph();
    addNeuron(graph, 'unrelated representative', 'memory/governance', [1, 0, 0]);
    const result = await new TopicClassifier(graph, { confidenceThreshold: 1.1, enableEmbedding: true }, undefined, new KeywordEmbedder()).classifyAsync('Atlas semantic note', 'project-a');
    expect(result).toMatchObject({ topicPath: 'memory/governance', strategy: 'embedding' });
  });

  test('lexical classification remains first priority', async () => {
    const graph = new MemoryGraph();
    addNeuron(graph, 'memory governance policy', 'memory/governance', [0, 1, 0]);
    const result = await new TopicClassifier(graph, { enableEmbedding: true }, undefined, new KeywordEmbedder()).classifyAsync('memory governance update', 'project-a');
    expect(result.strategy).toBe('lexical');
  });

  test('embedding threshold blocks weak matches', async () => {
    const graph = new MemoryGraph();
    addNeuron(graph, 'unrelated representative', 'memory/governance', [1, 0, 0]);
    const result = await new TopicClassifier(graph, { confidenceThreshold: 1.1, enableEmbedding: true, embeddingThreshold: 1.01 }, undefined, new KeywordEmbedder()).classifyAsync('Atlas semantic note', 'project-a');
    expect(result.strategy).toBe('fallback');
  });

  test('enableEmbedding false keeps v1.8 fallback behavior', async () => {
    const graph = new MemoryGraph();
    addNeuron(graph, 'unrelated representative', 'memory/governance', [1, 0, 0]);
    const result = await new TopicClassifier(graph, { confidenceThreshold: 1.1, enableEmbedding: false }, undefined, new KeywordEmbedder()).classifyAsync('Atlas semantic note', 'project-a');
    expect(result.strategy).toBe('fallback');
  });

  test('classify remains synchronous and does not call embedding', () => {
    const graph = new MemoryGraph();
    addNeuron(graph, 'unrelated representative', 'memory/governance', [1, 0, 0]);
    const result = new TopicClassifier(graph, { confidenceThreshold: 1.1, enableEmbedding: true }, undefined, new KeywordEmbedder()).classify('Atlas semantic note', 'project-a');
    expect(result.strategy).toBe('fallback');
  });

  test('summary neuron vector can represent a topic', async () => {
    const graph = new MemoryGraph();
    addNeuron(graph, 'topic summary', 'memory/governance', [1, 0, 0], Date.now(), ['topic_summary']);
    const result = await new TopicClassifier(graph, { confidenceThreshold: 1.1, enableEmbedding: true }, undefined, new KeywordEmbedder()).classifyAsync('Atlas semantic note', 'project-a');
    expect(result.topicPath).toBe('memory/governance');
  });

  test('project scoped classification ignores other project vectors', async () => {
    const graph = new MemoryGraph();
    addNeuron(graph, 'project a representative', 'skills/runtime', [0, 1, 0]);
    const neuron = NeuronFactory.create('project b representative', 'genesis', { T: Date.now(), S: [0, 0, 0], V: [1, 0, 0] }, {
      projectId: 'project-b',
      topicPath: 'memory/governance',
      type: 'chat',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      status: 'active',
      confidence: 1,
      tags: []
    });
    graph.addNeuron(neuron);
    const result = await new TopicClassifier(graph, { confidenceThreshold: 1.1, enableEmbedding: true }, undefined, new KeywordEmbedder()).classifyAsync('Atlas semantic note', 'project-a');
    expect(result.strategy).toBe('fallback');
  });
});
