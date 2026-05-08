import { expect, test } from 'bun:test';
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { createMemoryKernel } from '../src/factory.js';
import { parseArgs } from '../src/bin/import-support.js';

const coreRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const openClawImportBin = join(coreRoot, 'src/bin/import-openclaw.ts');
const hermesImportBin = join(coreRoot, 'src/bin/import-hermes.ts');

async function runCli(
  cmd: string[],
  cwd = coreRoot,
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  const proc = Bun.spawn({
    cmd,
    cwd,
    stdout: 'pipe',
    stderr: 'pipe',
    env: {
      ...process.env,
      NO_COLOR: '1',
    },
  });

  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  const exitCode = await proc.exited;
  return { exitCode, stdout, stderr };
}

test('OpenClaw import dry-run scans workspace sources without creating a memory database', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'cogmem-openclaw-dry-'));
  const dbPath = join(dir, 'memory.db');
  mkdirSync(join(dir, 'memory'));
  writeFileSync(join(dir, 'USER.md'), 'User prefers Bluetooth protocol project notes.');
  writeFileSync(join(dir, 'memory', '2026-05-07.md'), [
    '# 2026-05-07',
    '- 09:00 User: Bluetooth provisioning uses a GATT config service.',
    '- 09:01 Agent: Stored the Bluetooth project context.',
  ].join('\n'));

  const result = await runCli([
    'bun',
    openClawImportBin,
    '--workspace',
    dir,
    '--db',
    dbPath,
    '--project',
    'openclaw-test',
    '--dry-run',
    '--json',
  ]);

  expect(result.stderr).toBe('');
  expect(result.exitCode).toBe(0);
  const parsed = JSON.parse(result.stdout);
  expect(parsed.agent).toBe('openclaw');
  expect(parsed.dryRun).toBe(true);
  expect(parsed.sourcesScanned).toBe(2);
  expect(parsed.recordsParsed).toBeGreaterThanOrEqual(2);
  expect(parsed.recordsWouldIngest).toBe(parsed.recordsParsed);
  expect(Bun.file(dbPath).exists()).resolves.toBe(false);
});

test('OpenClaw import writes memory once and skips already imported records on repeat runs', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'cogmem-openclaw-import-'));
  const dbPath = join(dir, 'memory.db');
  mkdirSync(join(dir, 'memory'));
  writeFileSync(join(dir, 'USER.md'), 'User identity: remembers protocol design details.');
  writeFileSync(join(dir, 'memory', '2026-05-07.md'), [
    '# 2026-05-07',
    '- 09:00 User: Bluetooth protocol project used BLE device provisioning.',
    '- 09:01 Agent: Logged the Bluetooth project memory.',
  ].join('\n'));

  const first = await runCli([
    'bun',
    openClawImportBin,
    '--workspace',
    dir,
    '--db',
    dbPath,
    '--project',
    'openclaw-test',
    '--json',
  ]);

  expect(first.stderr).toBe('');
  expect(first.exitCode).toBe(0);
  const firstParsed = JSON.parse(first.stdout);
  expect(firstParsed.recordsIngested).toBeGreaterThanOrEqual(2);

  const second = await runCli([
    'bun',
    openClawImportBin,
    '--workspace',
    dir,
    '--db',
    dbPath,
    '--project',
    'openclaw-test',
    '--json',
  ]);

  expect(second.stderr).toBe('');
  expect(second.exitCode).toBe(0);
  const secondParsed = JSON.parse(second.stdout);
  expect(secondParsed.recordsIngested).toBe(0);
  expect(secondParsed.skippedRecords).toBeGreaterThanOrEqual(firstParsed.recordsIngested);

  const kernel = createMemoryKernel({ dbPath });
  const recalled = kernel.recall('Bluetooth provisioning project', {
    projectId: 'openclaw-test',
    includeRawEvidence: true,
  });
  kernel.close();
  expect(recalled.rawEvidence.some((item) => item.content.includes('BLE device provisioning'))).toBe(true);
});

test('Hermes import migrates profile and session markdown into core memory', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'cogmem-hermes-import-'));
  const dbPath = join(dir, 'memory.db');
  mkdirSync(join(dir, 'sessions'));
  writeFileSync(join(dir, 'profile.md'), 'Preference: Hermes should remember release gate commands.');
  writeFileSync(join(dir, 'sessions', 'session.md'), [
    '# 2026-05-07',
    'Human: The Bluetooth protocol project used a GATT configuration service.',
    'AI: I will keep that memory available.',
  ].join('\n'));

  const result = await runCli([
    'bun',
    hermesImportBin,
    '--workspace',
    dir,
    '--db',
    dbPath,
    '--project',
    'hermes-test',
    '--profile',
    'profile.md',
    '--sessions',
    'sessions',
    '--json',
  ]);

  expect(result.stderr).toBe('');
  expect(result.exitCode).toBe(0);
  const parsed = JSON.parse(result.stdout);
  expect(parsed.agent).toBe('hermes');
  expect(parsed.sourcesScanned).toBe(2);
  expect(parsed.recordsIngested).toBeGreaterThanOrEqual(2);

  const kernel = createMemoryKernel({ dbPath });
  const recalled = kernel.recall('GATT configuration service', {
    projectId: 'hermes-test',
    includeRawEvidence: true,
  });
  kernel.close();
  expect(recalled.rawEvidence.some((item) => item.content.includes('GATT configuration service'))).toBe(true);
});

test('OpenClaw import auto-discovers structured cogmem config instead of env files', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'cogmem-openclaw-config-import-'));
  const dbPath = join(dir, '.cogmem', 'memory.db');
  const configPath = join(dir, '.cogmem', 'config.toml');
  mkdirSync(join(dir, '.cogmem'), { recursive: true });
  mkdirSync(join(dir, 'memory'));
  writeFileSync(configPath, [
    '[core]',
    'db_path = "memory.db"',
    'vector_backend = "sqlite-vec"',
  ].join('\n'));
  writeFileSync(join(dir, 'USER.md'), 'User identity: OpenClaw remembers Bluetooth work.');
  writeFileSync(join(dir, 'memory', '2026-05-07.md'), 'User: Bluetooth GATT config service.\nAgent: Stored.');

  const result = await runCli([
    'bun',
    openClawImportBin,
    '--workspace',
    dir,
    '--project',
    'openclaw-config-test',
    '--json',
  ]);

  expect(result.stderr).toBe('');
  expect(result.exitCode).toBe(0);
  const parsed = JSON.parse(result.stdout);
  expect(parsed.recordsIngested).toBeGreaterThanOrEqual(2);
  expect(Bun.file(dbPath).exists()).resolves.toBe(true);
});

test('OpenClaw import resolves explicit --config relative to the shell cwd', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'cogmem-openclaw-explicit-config-'));
  const workspace = join(dir, 'workspace');
  const configDir = join(dir, 'configs');
  const dbPath = join(configDir, 'memory.db');
  mkdirSync(join(workspace, 'memory'), { recursive: true });
  mkdirSync(configDir, { recursive: true });
  writeFileSync(join(configDir, 'config.toml'), [
    '[core]',
    'db_path = "memory.db"',
    'vector_backend = "sqlite-vec"',
  ].join('\n'));
  writeFileSync(join(workspace, 'USER.md'), 'User identity: explicit config import.');
  writeFileSync(join(workspace, 'memory', '2026-05-07.md'), 'User: explicit config should resolve from cwd.');

  const result = await runCli([
    'bun',
    openClawImportBin,
    '--workspace',
    workspace,
    '--config',
    'configs/config.toml',
    '--project',
    'openclaw-explicit-config-test',
    '--json',
  ], dir);

  expect(result.stderr).toBe('');
  expect(result.exitCode).toBe(0);
  const parsed = JSON.parse(result.stdout);
  expect(parsed.recordsIngested).toBeGreaterThanOrEqual(2);
  expect(Bun.file(dbPath).exists()).resolves.toBe(true);
  expect(realpathSync(parsed.dbPath)).toBe(realpathSync(dbPath));
});

test('agent-facing runbooks tell OpenClaw and Hermes agents how to self-install and migrate', async () => {
  const openclaw = await Bun.file(join(coreRoot, 'examples/openclaw-backend/AGENTS.md')).text();
  const hermes = await Bun.file(join(coreRoot, 'examples/hermes-backend/AGENTS.md')).text();

  expect(openclaw).toContain('bunx cogmem-init --agent openclaw');
  expect(openclaw).toContain('~/.cogmem/config.toml');
  expect(openclaw).toContain('cogmem-import-openclaw');
  expect(openclaw).toContain('KernelAgentMemoryBackend');
  expect(openclaw).toContain('Do not import AGENTS.md');

  expect(hermes).toContain('bunx cogmem-init --agent hermes');
  expect(hermes).toContain('~/.cogmem/config.toml');
  expect(hermes).toContain('cogmem-import-hermes');
  expect(hermes).toContain('KernelAgentMemoryBackend');
  expect(hermes).toContain('profile.md');
});

test('package exposes agent migration bins', () => {
  const packageJson = JSON.parse(readFileSync(join(coreRoot, 'package.json'), 'utf8'));

  expect(packageJson.bin['cogmem-import-openclaw']).toBe('./dist/bin/import-openclaw.js');
  expect(packageJson.bin['cogmem-import-hermes']).toBe('./dist/bin/import-hermes.js');
});

test('import CLI parser keeps repeated path arguments in order without duplication', () => {
  const parsed = parseArgs([
    '--session',
    'one.md',
    '--session',
    'two.md',
    '--session',
    'three.md',
  ]);

  expect(parsed.values.session).toBe('one.md');
  expect(parsed.lists.session).toEqual(['two.md', 'three.md']);
});
