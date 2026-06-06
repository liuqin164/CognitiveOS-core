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
