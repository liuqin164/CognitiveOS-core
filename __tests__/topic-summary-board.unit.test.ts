import { describe, expect, test } from 'bun:test';
import { MemoryGraph } from '../src/core/MemoryGraph.js';
import { NeuronFactory } from '../src/core/Neuron.js';
import { TopicSummaryBoard } from '../src/recall/TopicSummaryBoard.js';
import { SummaryStore } from '../src/store/SummaryStore.js';
import type { Neuron } from '../src/types/index.js';

function addNeuron(graph: MemoryGraph, content: string, topicPath = 'memory/governance', projectId = 'project-a', createdAt = Date.now()): Neuron {
  const neuron = NeuronFactory.create(content, graph.getLatestNeuronSelfHash(projectId) || 'genesis', { T: createdAt, S: [0, 0, 0], V: [] }, {
    projectId,
    topicPath,
    type: 'chat',
    createdAt,
    updatedAt: createdAt,
    status: 'active',
    confidence: 1,
    tags: []
  });
  graph.addNeuron(neuron);
  return neuron;
}

function board(graph = new MemoryGraph()): TopicSummaryBoard {
  return new TopicSummaryBoard(graph, new SummaryStore());
}

describe('TopicSummaryBoard', () => {
  test('refresh returns null for empty topic path', () => {
    expect(board().refresh('', 'project-a')).toBeNull();
  });

  test('refresh returns null when topic has no source neurons', () => {
    expect(board().refresh('memory/governance', 'project-a')).toBeNull();
  });

  test('refresh creates a doc summary neuron for a topic', () => {
    const graph = new MemoryGraph();
    addNeuron(graph, 'memory governance policy');
    const id = board(graph).refresh('memory/governance', 'project-a');
    const summary = graph.getNeuron(id!);
    expect(summary?.metadata.type).toBe('doc');
    expect(summary?.metadata.tags).toContain('topic_summary');
  });

  test('summary neuron keeps the normalized topicPath', () => {
    const graph = new MemoryGraph();
    addNeuron(graph, 'memory governance policy');
    const id = board(graph).refresh('/memory/governance/', 'project-a');
    expect(graph.getNeuron(id!)?.metadata.topicPath).toBe('memory/governance');
  });

  test('summary content includes coverage count', () => {
    const graph = new MemoryGraph();
    addNeuron(graph, 'first policy');
    addNeuron(graph, 'second policy');
    const id = board(graph).refresh('memory/governance', 'project-a');
    expect(graph.getNeuron(id!)?.content).toContain('Covers 2 memories.');
  });

  test('getSummaryNeuron returns latest summary for exact topic', () => {
    const graph = new MemoryGraph();
    addNeuron(graph, 'runtime topic', 'skills/runtime');
    const b = board(graph);
    b.refresh('skills/runtime', 'project-a');
    expect(b.getSummaryNeuron('skills/runtime', 'project-a')?.metadata.topicPath).toBe('skills/runtime');
  });

  test('getSummaryNeuron does not cross project boundaries', () => {
    const graph = new MemoryGraph();
    addNeuron(graph, 'project a policy', 'memory/governance', 'project-a');
    const b = board(graph);
    b.refresh('memory/governance', 'project-a');
    expect(b.getSummaryNeuron('memory/governance', 'project-b')).toBeNull();
  });

  test('refresh reuses existing summary neuron when unchanged', () => {
    const graph = new MemoryGraph();
    addNeuron(graph, 'memory governance policy');
    const b = board(graph);
    const first = b.refresh('memory/governance', 'project-a');
    const second = b.refresh('memory/governance', 'project-a');
    expect(second).toBe(first);
  });

  test('forceRebuild updates the existing summary neuron instead of duplicating it', () => {
    const graph = new MemoryGraph();
    addNeuron(graph, 'memory governance policy');
    const b = board(graph);
    const first = b.refresh('memory/governance', 'project-a');
    const second = b.refresh('memory/governance', 'project-a', { forceRebuild: true });
    expect(second).toBe(first);
    expect(graph.getNeuronIdsByTopicPrefix('memory/governance', 'project-a').filter((id) => graph.getNeuron(id)?.metadata.tags?.includes('topic_summary')).length).toBe(1);
  });

  test('listEntries reports summary metadata', () => {
    const graph = new MemoryGraph();
    addNeuron(graph, 'memory governance policy');
    const b = board(graph);
    const id = b.refresh('memory/governance', 'project-a');
    expect(b.listEntries('project-a')).toEqual([expect.objectContaining({ topicPath: 'memory/governance', summaryNeuronId: id, coveredNeuronCount: 1 })]);
  });

  test('listEntries omits topics without summaries', () => {
    const graph = new MemoryGraph();
    addNeuron(graph, 'memory governance policy');
    expect(board(graph).listEntries('project-a')).toEqual([]);
  });
});
