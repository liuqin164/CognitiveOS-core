import { expect, test } from 'bun:test';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { KernelAgentMemoryBackend } from '../src/agent/AgentMemoryBackend.js';
import { createMemoryKernel } from '../src/factory.js';

test('dream ledger reports undreamed raw backlog for raw-then-dream turns', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'cogmem-dream-ledger-'));
  const kernel = createMemoryKernel({ dbPath: join(dir, 'memory.db'), vectorBackend: 'sqlite-vec' });
  const backend = new KernelAgentMemoryBackend(kernel);

  await backend.rememberTurnWithResult({
    agentId: 'openclaw',
    projectId: 'demo',
    sessionId: 'session-dream',
    userText: 'Raw then dream should not silently pile up.',
    assistantText: 'Stored raw for later consolidation.',
    ingestMode: 'raw_then_dream',
  });

  const status = kernel.getDreamBacklogStatus('demo');
  expect(status.projectId).toBe('demo');
  expect(status.rawEventCount).toBe(2);
  expect(status.undreamedRawCount).toBe(2);
  expect(status.dreamCoverageRate).toBe(0);
  expect(status.lastDreamedGlobalSeq).toBeUndefined();

  kernel.close();
});

test('dream ledger markDreamed advances coverage without deleting raw events', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'cogmem-dream-ledger-mark-'));
  const kernel = createMemoryKernel({ dbPath: join(dir, 'memory.db'), vectorBackend: 'sqlite-vec' });
  const backend = new KernelAgentMemoryBackend(kernel);

  await backend.rememberTurnWithResult({
    agentId: 'openclaw',
    projectId: 'demo',
    sessionId: 'session-dream',
    userText: 'Dream coverage should advance after consolidation.',
    assistantText: 'Stored raw for later consolidation.',
    ingestMode: 'raw_then_dream',
  });
  const latestSeq = Math.max(...kernel.getThreadEvents('session-dream').map((event) => event.globalSeq || 0));

  kernel.markDreamed('demo', latestSeq);
  const status = kernel.getDreamBacklogStatus('demo');

  expect(status.rawEventCount).toBe(2);
  expect(status.undreamedRawCount).toBe(0);
  expect(status.dreamCoverageRate).toBe(1);
  expect(status.lastDreamedGlobalSeq).toBe(latestSeq);
  expect(kernel.getThreadEvents('session-dream')).toHaveLength(2);

  kernel.close();
});

test('dream curator compiles raw backlog into governed candidates without hot vectors', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'cogmem-dream-curator-'));
  const kernel = createMemoryKernel({ dbPath: join(dir, 'memory.db'), vectorBackend: 'sqlite-vec' });
  const backend = new KernelAgentMemoryBackend(kernel);

  await backend.rememberTurnWithResult({
    agentId: 'openclaw',
    projectId: 'demo',
    sessionId: 'session-dream',
    userText: '请以后始终记住：记忆内核不是 Obsidian 替代品，也不要把它做成 wiki。',
    assistantText: '明白，我会把它作为 agent-native memory kernel 的边界约束处理。',
    ingestMode: 'raw_then_dream',
  });
  const vectorCountBefore = kernel.vectorStore.getCurrentCount();

  const result = await kernel.runDreamCurator({ projectId: 'demo', limit: 10 });
  const candidates = kernel.listDreamCandidates({ statuses: ['candidate'], limit: 20 });
  const candidateTypes = candidates.map((candidate) => candidate.candidateType);

  expect(result.skipped).toBe(false);
  expect(result.processedEventCount).toBe(2);
  expect(result.candidateCount).toBeGreaterThanOrEqual(2);
  expect(candidateTypes).toContain('summary');
  expect(candidateTypes).toContain('preferences');
  expect(kernel.vectorStore.getCurrentCount()).toBe(vectorCountBefore);
  expect(kernel.getDreamBacklogStatus('demo').undreamedRawCount).toBe(0);
  expect(candidates.every((candidate) => candidate.status === 'candidate')).toBe(true);
  expect(JSON.stringify(candidates)).toContain('"eventId"');
  expect(JSON.stringify(candidates)).toContain('"sourceAnchor"');

  kernel.close();
});

test('dream curator suppresses operational noise before candidate generation', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'cogmem-dream-curator-noise-'));
  const kernel = createMemoryKernel({ dbPath: join(dir, 'memory.db'), vectorBackend: 'sqlite-vec' });

  kernel.recordRawEvent({
    projectId: 'demo',
    threadId: 'thread-noise',
    sessionId: 'session-noise',
    role: 'user',
    content: '[OpenClaw heartbeat poll]',
  });
  kernel.recordRawEvent({
    projectId: 'demo',
    threadId: 'thread-noise',
    sessionId: 'session-noise',
    role: 'assistant',
    content: 'HEARTBEAT_OK',
  });
  kernel.recordRawEvent({
    projectId: 'demo',
    threadId: 'thread-noise',
    sessionId: 'session-noise',
    role: 'user',
    content: '我的长期目标是让 CogMem 能自然浮现旧但重要的项目记忆。',
  });

  const result = await kernel.runDreamCurator({ projectId: 'demo', limit: 10 });
  const candidates = kernel.listDreamCandidates({ statuses: ['candidate'], limit: 20 });
  const serialized = JSON.stringify(candidates);

  expect(result.processedEventCount).toBe(3);
  expect(result.dreamableEventCount).toBe(1);
  expect(result.candidateCount).toBeGreaterThan(0);
  expect(serialized).toContain('自然浮现');
  expect(serialized).not.toContain('HEARTBEAT_OK');
  expect(serialized).not.toContain('heartbeat poll');

  kernel.close();
});
