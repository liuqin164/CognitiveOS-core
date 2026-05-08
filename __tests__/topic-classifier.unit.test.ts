import { describe, expect, test } from 'bun:test';
import { MemoryGraph } from '../src/core/MemoryGraph.js';
import { NeuronFactory } from '../src/core/Neuron.js';
import { TopicClassifier } from '../src/recall/TopicClassifier.js';
import type { Neuron } from '../src/types/index.js';

function addNeuron(graph: MemoryGraph, content: string, topicPath?: string, projectId = 'project-a'): Neuron {
  const now = Date.now();
  const neuron = NeuronFactory.create(content, graph.getLatestNeuronSelfHash(projectId) || 'genesis', { T: now, S: [0, 0, 0], V: [] }, {
    projectId,
    topicPath,
    type: 'chat',
    createdAt: now,
    updatedAt: now,
    status: 'active',
    tags: [],
    confidence: 1
  });
  graph.addNeuron(neuron);
  return neuron;
}

describe('TopicClassifier', () => {
  test('falls back when no topic paths exist', () => {
    const result = new TopicClassifier(new MemoryGraph()).classify('memory governance', 'project-a');
    expect(result).toEqual({ topicPath: undefined, confidence: 0, strategy: 'fallback' });
  });

  test('classifies highly matching content to the only topic path', () => {
    const graph = new MemoryGraph();
    addNeuron(graph, 'seed', 'memory/governance');
    const result = new TopicClassifier(graph).classify('memory governance policy update', 'project-a');
    expect(result.strategy).toBe('lexical');
    expect(result.topicPath).toBe('memory/governance');
    expect(result.confidence).toBeGreaterThanOrEqual(0.25);
  });

  test('falls back when the best score is below threshold', () => {
    const graph = new MemoryGraph();
    addNeuron(graph, 'seed', 'memory/governance');
    const result = new TopicClassifier(graph).classify('unrelated calendar weather', 'project-a');
    expect(result.strategy).toBe('fallback');
    expect(result.topicPath).toBeUndefined();
  });

  test('returns the highest scoring topic among multiple candidates', () => {
    const graph = new MemoryGraph();
    addNeuron(graph, 'seed', 'memory/governance');
    addNeuron(graph, 'seed', 'skills/runtime');
    const result = new TopicClassifier(graph).classify('skill runtime execution failed', 'project-a');
    expect(result.topicPath).toBe('skills/runtime');
  });

  test('respects maxTopicsToScore candidate limit', () => {
    const graph = new MemoryGraph();
    addNeuron(graph, 'seed one', 'memory/governance');
    addNeuron(graph, 'seed two', 'skills/runtime');
    const result = new TopicClassifier(graph, { maxTopicsToScore: 1 }).classify('skills runtime', 'project-a');
    expect(result.topicPath).toBeUndefined();
    expect(result.strategy).toBe('fallback');
  });

  test('normalizes returned topic paths', () => {
    const graph = new MemoryGraph();
    addNeuron(graph, 'seed', '/Memory//Governance/');
    const result = new TopicClassifier(graph).classify('memory governance', 'project-a');
    expect(result.topicPath).toBe('memory/governance');
  });

  test('uses configurable confidence threshold', () => {
    const graph = new MemoryGraph();
    addNeuron(graph, 'seed', 'memory/governance');
    const strict = new TopicClassifier(graph, { confidenceThreshold: 1.1 }).classify('memory governance', 'project-a');
    expect(strict.strategy).toBe('fallback');
  });

  test('falls back on empty content', () => {
    const graph = new MemoryGraph();
    addNeuron(graph, 'seed', 'memory/governance');
    expect(new TopicClassifier(graph).classify('', 'project-a').strategy).toBe('fallback');
  });

  test('keeps project boundaries while classifying', () => {
    const graph = new MemoryGraph();
    addNeuron(graph, 'seed', 'memory/governance', 'project-a');
    addNeuron(graph, 'seed', 'skills/runtime', 'project-b');
    const result = new TopicClassifier(graph).classify('skills runtime', 'project-a');
    expect(result.topicPath).toBeUndefined();
  });

  test('embedding option remains a fallback stub when lexical misses', () => {
    const graph = new MemoryGraph();
    addNeuron(graph, 'seed', 'memory/governance');
    const result = new TopicClassifier(graph, { enableEmbedding: true }).classify('unrelated weather', 'project-a');
    expect(result.strategy).toBe('fallback');
    expect(result.topicPath).toBeUndefined();
  });
});
