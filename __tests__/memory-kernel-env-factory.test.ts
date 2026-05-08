import { expect, test } from 'bun:test';
import { existsSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { createMemoryKernelFromEnv } from '../src/factory.js';

test('createMemoryKernelFromEnv loads .agent-brain.env style files without overriding existing env', () => {
  const dir = mkdtempSync(join(tmpdir(), 'memory-kernel-env-'));
  const envPath = join(dir, '.agent-brain.env');
  const loadedKey = `AGENT_BRAIN_ENV_TEST_${Date.now()}`;
  const existingKey = `${loadedKey}_EXISTING`;
  delete process.env[loadedKey];
  process.env[existingKey] = 'already-set';
  writeFileSync(envPath, [
    '# local model config',
    `${loadedKey}=loaded-from-file`,
    `${existingKey}=from-file`,
    '',
  ].join('\n'));

  const kernel = createMemoryKernelFromEnv(envPath);

  expect(process.env[loadedKey]).toBe('loaded-from-file');
  expect(process.env[existingKey]).toBe('already-set');
  expect(kernel.getHealthStatus().package).toBe('@CognitiveOS/core');

  delete process.env[loadedKey];
  delete process.env[existingKey];
});

test('createMemoryKernelFromEnv consumes COGMEM_DB from env file', () => {
  const dir = mkdtempSync(join(tmpdir(), 'memory-kernel-env-db-'));
  const envPath = join(dir, '.agent-brain.env');
  const dbPath = join(dir, 'configured.db');
  const previousDb = process.env.COGMEM_DB;
  const previousVectorBackend = process.env.COGMEM_VECTOR_BACKEND;
  delete process.env.COGMEM_DB;
  delete process.env.COGMEM_VECTOR_BACKEND;

  writeFileSync(envPath, [
    `COGMEM_DB=${dbPath}`,
    'COGMEM_VECTOR_BACKEND=hnswlib',
  ].join('\n'));

  const kernel = createMemoryKernelFromEnv(envPath);

  expect(kernel.getHealthStatus().package).toBe('@CognitiveOS/core');
  expect(kernel.getHealthStatus().dbPath).toBe(dbPath);
  expect(existsSync(dbPath)).toBe(true);

  kernel.close();
  if (previousDb === undefined) delete process.env.COGMEM_DB;
  else process.env.COGMEM_DB = previousDb;
  if (previousVectorBackend === undefined) delete process.env.COGMEM_VECTOR_BACKEND;
  else process.env.COGMEM_VECTOR_BACKEND = previousVectorBackend;
});

test('createMemoryKernelFromEnv lets explicit vectorBackend override invalid env', () => {
  const previousVectorBackend = process.env.COGMEM_VECTOR_BACKEND;
  process.env.COGMEM_VECTOR_BACKEND = 'bad-backend';

  const kernel = createMemoryKernelFromEnv({
    autoLoadEnv: false,
    vectorBackend: 'sqlite-vec',
  });

  expect(kernel.getHealthStatus().status).toBe('ok');

  kernel.close();
  if (previousVectorBackend === undefined) delete process.env.COGMEM_VECTOR_BACKEND;
  else process.env.COGMEM_VECTOR_BACKEND = previousVectorBackend;
});
