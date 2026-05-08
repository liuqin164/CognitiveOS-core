import { expect, test } from 'bun:test';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { KernelAgentMemoryBackend } from '../src/agent/AgentMemoryBackend.js';
import { createMemoryKernel } from '../src/factory.js';

test('agent backend remembers and recalls a project-scoped turn', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'agent-backend-'));
  const kernel = createMemoryKernel({ dbPath: join(dir, 'brain.db'), vectorBackend: 'sqlite-vec' });
  const backend = new KernelAgentMemoryBackend(kernel);

  await backend.rememberTurn({
    agentId: 'openclaw',
    projectId: 'demo',
    sessionId: 'session-1',
    userText: 'Use Bun for local builds.',
    assistantText: 'I will use Bun for build and tests.',
    timestamp: 1_700_000_000_000,
  });

  const recalled = backend.recall({
    agentId: 'openclaw',
    projectId: 'demo',
    query: 'what runtime should local builds use?',
    limit: 3,
  });

  expect(recalled.items.some((item) => item.text.includes('Bun'))).toBe(true);
  expect(recalled.items.every((item) => item.projectId === 'demo')).toBe(true);

  kernel.close();
});

test('agent backend recall uses universe navigation as the default first path', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'agent-backend-universe-'));
  const kernel = createMemoryKernel({ dbPath: join(dir, 'brain.db'), vectorBackend: 'sqlite-vec' });
  const backend = new KernelAgentMemoryBackend(kernel);
  const day = Date.parse('2026-05-07T09:00:00+09:00');

  await backend.rememberTurn({
    agentId: 'openclaw',
    projectId: 'demo',
    sessionId: 'session-1',
    userText: 'Bluetooth protocol project used a GATT configuration service.',
    assistantText: 'I will keep the Bluetooth protocol project context.',
    timestamp: day,
  });
  await backend.rememberTurn({
    agentId: 'openclaw',
    projectId: 'demo',
    sessionId: 'session-1',
    userText: 'Bluetooth headset pairing was discussed in the same work session.',
    assistantText: 'I will keep the neighboring Bluetooth memory available.',
    timestamp: day + 60_000,
  });

  const recalled = backend.recall({
    agentId: 'openclaw',
    projectId: 'demo',
    query: 'Bluetooth protocol project',
    limit: 5,
  });

  expect(recalled.recallMode).toBe('universe_navigation');
  expect(recalled.narrative?.headline).toContain('universe navigation');
  expect(recalled.pulseTrace?.some((item) => item.stage === 'evidence_fusion')).toBe(true);
  expect(recalled.temporalTraversal?.labels).toContain('2026-05-07');
  expect(recalled.items.some((item) => item.text.includes('GATT configuration service'))).toBe(true);
  expect(recalled.items.some((item) => item.text.includes('Bluetooth headset pairing'))).toBe(true);

  kernel.close();
});

test('agent backend recall overfetches before agent tag filtering', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'agent-backend-scope-'));
  const kernel = createMemoryKernel({ dbPath: join(dir, 'brain.db'), vectorBackend: 'sqlite-vec' });
  const backend = new KernelAgentMemoryBackend(kernel);
  const day = Date.parse('2026-05-07T10:00:00+09:00');

  await backend.rememberTurn({
    agentId: 'hermes',
    projectId: 'shared-project',
    sessionId: 'hermes-session',
    userText: 'Bluetooth protocol project for Hermes uses a separate pairing note.',
    assistantText: 'Stored Hermes Bluetooth note.',
    timestamp: day,
  });
  await backend.rememberTurn({
    agentId: 'openclaw',
    projectId: 'shared-project',
    sessionId: 'openclaw-session',
    userText: 'Bluetooth protocol project for OpenClaw uses the GATT configuration service.',
    assistantText: 'Stored OpenClaw Bluetooth note.',
    timestamp: day + 60_000,
  });

  const recalled = backend.recall({
    agentId: 'openclaw',
    projectId: 'shared-project',
    query: 'Bluetooth protocol project',
    limit: 1,
  });

  expect(recalled.items).toHaveLength(1);
  expect(recalled.items[0].tags).toContain('agent:openclaw');
  expect(recalled.items[0].text).toContain('GATT configuration service');

  kernel.close();
});
