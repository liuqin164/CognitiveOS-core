import { expect, test } from 'bun:test';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';

import { createMemoryKernel } from '../src/factory.js';

function tempDbPath(): string {
  return join(tmpdir(), `memory-kernel-${randomUUID()}.sqlite`);
}

test('MemoryKernel.ingest runs the v1.9 write pipeline, not a minimal neuron insert', async () => {
  const kernel = createMemoryKernel({ dbPath: tempDbPath() });

  const seeded = await kernel.ingest({
    content: 'Memory vector retrieval belongs under the durable memory vector topic.',
    projectId: 'split-pipeline',
    topicPath: 'memory/vector',
  });
  const neuron = await kernel.ingest({
    content: 'This is important: memory vector retrieval indexing must stay deterministic.',
    projectId: 'split-pipeline',
  });

  expect(seeded.metadata.topicPath).toBe('memory/vector');
  expect(neuron.metadata.topicPath).toBe('memory/vector');
  expect(neuron.metadata.importanceLevel).toBe('important');
  expect(neuron.metadata.isPinned).toBe(true);
  expect(neuron.metadata.stability).toBeGreaterThan(1);
  expect(neuron.coordinates.V.length).toBe(384);
  expect(kernel.eventStore.getEventCount()).toBeGreaterThanOrEqual(6);
  expect(kernel.vectorStore.getStats().size).toBeGreaterThanOrEqual(2);
  expect(kernel.topologyStore.getMaterializedMembershipCount()).toBeGreaterThan(0);
  expect(kernel.cognitiveGraphStore.getNodeCount()).toBeGreaterThan(0);
});

test('MemoryKernel.consolidate executes offline consolidation instead of returning a noop marker', async () => {
  const kernel = createMemoryKernel({ dbPath: tempDbPath() });
  const startTime = Date.now() - 1_000;

  await kernel.ingest({
    content: 'This is important: I own a Framework Laptop for memory kernel testing.',
    projectId: 'split-consolidate',
    topicPath: 'devices/laptop',
  });

  const result = await kernel.consolidate({
    projectId: 'split-consolidate',
    startTime,
    endTime: Date.now() + 1_000,
  });

  expect(result).not.toEqual({ scheduled: false, queueReason: 'noop_standalone_kernel' });
  expect(Array.isArray(result.verifiedFacts)).toBe(true);
  expect(Array.isArray(result.verifiedEvents)).toBe(true);
  expect(kernel.pipelineMetrics.getLastRun()).toBeDefined();
});
