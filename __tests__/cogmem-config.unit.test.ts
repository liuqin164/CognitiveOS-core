import { expect, test } from 'bun:test';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  applyCogmemConfigToEnv,
  loadCogmemConfig,
  resolveCogmemConfigPath,
} from '../src/config/CogmemConfig.js';
import { createMemoryKernelFromConfig } from '../src/factory.js';

test('loadCogmemConfig parses TOML and resolves paths relative to the config file', () => {
  const root = mkdtempSync(join(tmpdir(), 'cogmem-config-'));
  const configPath = join(root, '.cogmem', 'config.toml');
  mkdirSync(join(root, '.cogmem'), { recursive: true });
  writeFileSync(configPath, [
    '[core]',
    'db_path = "memory.db"',
    'vector_backend = "sqlite-vec"',
    '',
    '[paths]',
    'snapshots_dir = "snapshots"',
    '',
    '[embedding]',
    'provider = "openai_compatible"',
    'base_url = "http://localhost:11434/v1"',
    'model = "nomic-embed-text"',
    '',
    '[memory_model]',
    'provider = "openai_compatible"',
    'base_url = "http://localhost:11434/v1"',
    'model = "qwen2.5:3b"',
    'api_key = "${COGMEM_TEST_API_KEY}"',
    '',
    '[governance]',
    'pii_redact_email = true',
    'pii_redact_phone = false',
    'pii_redact_ssn = true',
    'encryption = false',
    '',
    '[integrations.openclaw]',
    'enabled = true',
    'workspace_dir = "."',
  ].join('\n'));

  const loaded = loadCogmemConfig({
    configPath,
    env: { COGMEM_TEST_API_KEY: 'test-secret' },
  });

  expect(loaded.configPath).toBe(configPath);
  expect(loaded.homeDir).toBe(join(root, '.cogmem'));
  expect(loaded.options.dbPath).toBe(join(root, '.cogmem', 'memory.db'));
  expect(loaded.options.vectorBackend).toBe('sqlite-vec');
  expect(loaded.options.redactionPolicy).toEqual({ email: true, phone: false, ssn: true });
  expect(loaded.paths.snapshotsDir).toBe(join(root, '.cogmem', 'snapshots'));
  expect(loaded.env.AGENT_BRAIN_MODEL_MEMORY_API_KEY).toBe('test-secret');
  expect(loaded.integrations.openclaw.enabled).toBe(true);
  expect(loaded.diagnostics).toEqual([]);
});

test('loadCogmemConfig maps vector_dimension to kernel options and env', () => {
  const root = mkdtempSync(join(tmpdir(), 'cogmem-vector-dimension-'));
  const configPath = join(root, '.cogmem', 'config.toml');
  mkdirSync(join(root, '.cogmem'), { recursive: true });
  writeFileSync(configPath, [
    '[core]',
    'db_path = "memory.db"',
    'vector_backend = "sqlite-vec"',
    'vector_dimension = 4096',
  ].join('\n'));

  const loaded = loadCogmemConfig({ configPath, env: {} });

  expect(loaded.options.vectorDimension).toBe(4096);
  expect(loaded.env.AB_VECTOR_DIMENSION).toBe('4096');
  expect(loaded.diagnostics).toContainEqual(expect.objectContaining({
    severity: 'warning',
    code: 'high_vector_dimension',
  }));
});

test('loadCogmemConfig rejects invalid vector dimensions without imposing a hard upper bound', () => {
  const root = mkdtempSync(join(tmpdir(), 'cogmem-invalid-vector-dimension-'));
  const configPath = join(root, 'config.toml');
  writeFileSync(configPath, [
    '[core]',
    'db_path = "memory.db"',
    'vector_dimension = 0',
  ].join('\n'));

  const loaded = loadCogmemConfig({ configPath, env: {} });

  expect(loaded.options.vectorDimension).toBeUndefined();
  expect(loaded.diagnostics).toContainEqual(expect.objectContaining({
    severity: 'error',
    code: 'invalid_vector_dimension',
  }));
});

test('loadCogmemConfig rejects partially numeric vector dimensions', () => {
  const root = mkdtempSync(join(tmpdir(), 'cogmem-partial-vector-dimension-'));
  const configPath = join(root, 'config.toml');
  writeFileSync(configPath, [
    '[core]',
    'db_path = "memory.db"',
    'vector_dimension = "4096px"',
  ].join('\n'));

  const loaded = loadCogmemConfig({ configPath, env: {} });

  expect(loaded.options.vectorDimension).toBeUndefined();
  expect(loaded.diagnostics).toContainEqual(expect.objectContaining({
    severity: 'error',
    code: 'invalid_vector_dimension',
  }));
});

test('resolveCogmemConfigPath prefers project .cogmem over global home and falls back to legacy env', () => {
  const root = mkdtempSync(join(tmpdir(), 'cogmem-discovery-'));
  const nested = join(root, 'packages', 'demo');
  const home = join(root, 'home');
  mkdirSync(join(nested, '.cogmem'), { recursive: true });
  mkdirSync(join(home, '.cogmem'), { recursive: true });
  writeFileSync(join(nested, '.cogmem', 'config.toml'), '[core]\ndb_path = "project.db"\n');
  writeFileSync(join(home, '.cogmem', 'config.toml'), '[core]\ndb_path = "global.db"\n');
  writeFileSync(join(root, '.agent-brain.env'), 'COGMEM_DB=legacy.db\n');

  expect(resolveCogmemConfigPath({ cwd: nested, env: { HOME: home } })).toEqual({
    kind: 'toml',
    path: join(nested, '.cogmem', 'config.toml'),
  });

  expect(resolveCogmemConfigPath({ cwd: root, env: { HOME: home } })).toEqual({
    kind: 'toml',
    path: join(home, '.cogmem', 'config.toml'),
  });

  expect(resolveCogmemConfigPath({ cwd: root, env: { HOME: join(root, 'empty-home') } })).toEqual({
    kind: 'env',
    path: join(root, '.agent-brain.env'),
  });
});

test('applyCogmemConfigToEnv maps structured config to existing model env variables', () => {
  const root = mkdtempSync(join(tmpdir(), 'cogmem-env-map-'));
  const configPath = join(root, 'config.toml');
  writeFileSync(configPath, [
    '[core]',
    'db_path = "memory.db"',
    '',
    '[embedding]',
    'provider = "openai_compatible"',
    'base_url = "http://localhost:11434/v1"',
    'model = "nomic-embed-text"',
    '',
    '[memory_model]',
    'provider = "rule_only"',
    'model = "rule_only"',
  ].join('\n'));
  const targetEnv: Record<string, string | undefined> = {};
  const loaded = loadCogmemConfig({ configPath, env: {} });

  applyCogmemConfigToEnv(loaded, targetEnv);

  expect(targetEnv.COGMEM_DB).toBe(join(root, 'memory.db'));
  expect(targetEnv.AGENT_BRAIN_MODEL_EMBEDDING_PROVIDER).toBe('openai_compatible');
  expect(targetEnv.AGENT_BRAIN_MODEL_EMBEDDING_NAME).toBe('nomic-embed-text');
  expect(targetEnv.AGENT_BRAIN_MODEL_MEMORY_PROVIDER).toBe('rule_only');
});

test('applyCogmemConfigToEnv clears stale optional model env variables', () => {
  const root = mkdtempSync(join(tmpdir(), 'cogmem-env-clear-'));
  const configPath = join(root, 'config.toml');
  writeFileSync(configPath, [
    '[core]',
    'db_path = "memory.db"',
    '',
    '[embedding]',
    'provider = "openai_compatible"',
    'model = "nomic-embed-text"',
    '',
    '[memory_model]',
    'provider = "rule_only"',
    'model = "rule_only"',
  ].join('\n'));
  const targetEnv: Record<string, string | undefined> = {
    AGENT_BRAIN_MODEL_EMBEDDING_BASE_URL: 'https://stale.example/v1',
    AGENT_BRAIN_MODEL_EMBEDDING_API_KEY: 'stale-key',
    AGENT_BRAIN_MODEL_MEMORY_API_KEY: 'stale-memory-key',
  };

  applyCogmemConfigToEnv(loadCogmemConfig({ configPath, env: {} }), targetEnv);

  expect(targetEnv.AGENT_BRAIN_MODEL_EMBEDDING_BASE_URL).toBe('http://localhost:11434/v1');
  expect(targetEnv.AGENT_BRAIN_MODEL_EMBEDDING_API_KEY).toBe('');
  expect(targetEnv.AGENT_BRAIN_MODEL_MEMORY_API_KEY).toBe('');
});

test('loadCogmemConfig reports invalid model providers', () => {
  const root = mkdtempSync(join(tmpdir(), 'cogmem-invalid-provider-'));
  const configPath = join(root, 'config.toml');
  writeFileSync(configPath, [
    '[core]',
    'db_path = "memory.db"',
    '',
    '[embedding]',
    'provider = "anthropic"',
    'model = "nomic-embed-text"',
  ].join('\n'));

  const loaded = loadCogmemConfig({ configPath, env: {} });

  expect(loaded.diagnostics).toContainEqual(expect.objectContaining({
    severity: 'error',
    code: 'invalid_model_provider',
  }));
});

test('createMemoryKernelFromConfig opens the TOML configured database', () => {
  const root = mkdtempSync(join(tmpdir(), 'cogmem-kernel-config-'));
  const configPath = join(root, '.cogmem', 'config.toml');
  const dbPath = join(root, '.cogmem', 'memory.db');
  mkdirSync(join(root, '.cogmem'), { recursive: true });
  writeFileSync(configPath, [
    '[core]',
    'db_path = "memory.db"',
    'vector_backend = "sqlite-vec"',
  ].join('\n'));

  const kernel = createMemoryKernelFromConfig({ configPath });

  expect(kernel.getHealthStatus().dbPath).toBe(dbPath);
  kernel.close();
});

test('createMemoryKernelFromConfig applies vector_dimension to the active vector store', () => {
  const root = mkdtempSync(join(tmpdir(), 'cogmem-kernel-vector-dimension-'));
  const configPath = join(root, '.cogmem', 'config.toml');
  mkdirSync(join(root, '.cogmem'), { recursive: true });
  writeFileSync(configPath, [
    '[core]',
    'db_path = "memory.db"',
    'vector_backend = "sqlite-vec"',
    'vector_dimension = 4096',
  ].join('\n'));

  const kernel = createMemoryKernelFromConfig({ configPath });

  expect(kernel.vectorStore.getStats().dimension).toBe(4096);
  kernel.close();
});

test('createMemoryKernelFromConfig applies safe model defaults over stale process env', () => {
  const root = mkdtempSync(join(tmpdir(), 'cogmem-kernel-default-env-'));
  const configPath = join(root, '.cogmem', 'config.toml');
  mkdirSync(join(root, '.cogmem'), { recursive: true });
  writeFileSync(configPath, '[core]\ndb_path = "memory.db"\n');

  const previousProvider = process.env.AGENT_BRAIN_MODEL_EMBEDDING_PROVIDER;
  const previousMemoryProvider = process.env.AGENT_BRAIN_MODEL_MEMORY_PROVIDER;
  process.env.AGENT_BRAIN_MODEL_EMBEDDING_PROVIDER = 'openai_compatible';
  process.env.AGENT_BRAIN_MODEL_MEMORY_PROVIDER = 'anthropic';

  const kernel = createMemoryKernelFromConfig({ configPath });

  expect(process.env.AGENT_BRAIN_MODEL_EMBEDDING_PROVIDER).toBe('deterministic_local');
  expect(process.env.AGENT_BRAIN_MODEL_MEMORY_PROVIDER).toBe('rule_only');

  kernel.close();
  if (previousProvider === undefined) delete process.env.AGENT_BRAIN_MODEL_EMBEDDING_PROVIDER;
  else process.env.AGENT_BRAIN_MODEL_EMBEDDING_PROVIDER = previousProvider;
  if (previousMemoryProvider === undefined) delete process.env.AGENT_BRAIN_MODEL_MEMORY_PROVIDER;
  else process.env.AGENT_BRAIN_MODEL_MEMORY_PROVIDER = previousMemoryProvider;
});
