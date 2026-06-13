import { expect, test } from 'bun:test';
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const coreRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const normalizeBin = join(coreRoot, 'src/bin/normalize-transcript.ts');

async function runCli(cmd: string[]): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  const proc = Bun.spawn({
    cmd,
    cwd: coreRoot,
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

test('cogmem-normalize-transcript writes normalized markdown with JSON source refs', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'cogmem-normalize-json-'));
  const inputPath = join(dir, 'memory.json');
  const outputPath = join(dir, 'memory.normalized.md');
  writeFileSync(inputPath, JSON.stringify([
    { role: 'user', text: 'Remember JSON source order.', timestamp: '2026-06-01T10:00:00Z' },
    { role: 'assistant', text: 'Stored from JSON array.', timestamp: '2026-06-01T10:00:01Z' },
  ], null, 2));

  const result = await runCli([
    'bun',
    normalizeBin,
    '--input',
    inputPath,
    '--output',
    outputPath,
    '--family',
    'json-array',
    '--title',
    'Imported JSON Memory',
    '--json',
  ]);

  expect(result.stderr).toBe('');
  expect(result.exitCode).toBe(0);
  const summary = JSON.parse(result.stdout);
  expect(summary).toMatchObject({
    dryRun: false,
    family: 'json_array_transcript_export',
    messageCount: 2,
    sourceRefCount: 2,
    written: true,
    outputPath,
  });

  const output = readFileSync(outputPath, 'utf8');
  expect(output).toContain('<!-- cogmem-original-input-family: json_array_transcript_export -->');
  expect(output).toContain('<!-- cogmem-source-ref: {"sourceOffset":1,"orderingConfidence":"high"} -->');
  expect(output).toContain('<!-- cogmem-source-ref: {"sourceOffset":2,"orderingConfidence":"high"} -->');
  expect(output).toContain('- [2026-06-01T10:00:00.000Z] user: Remember JSON source order.');
});

test('cogmem-normalize-transcript dry-run reports CSV row anchors without writing output', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'cogmem-normalize-csv-'));
  const inputPath = join(dir, 'memory.csv');
  const outputPath = join(dir, 'memory.normalized.md');
  writeFileSync(inputPath, [
    'timestamp,role,text',
    '2026-06-01T10:00:00Z,user,Remember CSV row two.',
    '2026-06-01T10:00:01Z,assistant,Stored from CSV row three.',
  ].join('\n'));

  const result = await runCli([
    'bun',
    normalizeBin,
    '--input',
    inputPath,
    '--output',
    outputPath,
    '--family',
    'csv',
    '--dry-run',
    '--json',
  ]);

  expect(result.stderr).toBe('');
  expect(result.exitCode).toBe(0);
  expect(existsSync(outputPath)).toBe(false);
  const summary = JSON.parse(result.stdout);
  expect(summary).toMatchObject({
    dryRun: true,
    family: 'csv_transcript_export',
    messageCount: 2,
    sourceRefCount: 2,
    written: false,
  });
  expect(summary.sourceRefs).toEqual([
    { sourceOffset: 1, lineStart: 2, lineEnd: 2, orderingConfidence: 'high' },
    { sourceOffset: 2, lineStart: 3, lineEnd: 3, orderingConfidence: 'high' },
  ]);
});

test('README documents normalize transcript usage and source-ref output', async () => {
  const readme = await Bun.file(join(coreRoot, 'README.md')).text();

  expect(readme).toContain('cogmem-normalize-transcript');
  expect(readme).toContain('--family json-array');
  expect(readme).toContain('--family csv');
  expect(readme).toContain('--dry-run --json');
  expect(readme).toContain('cogmem-source-ref');
  expect(readme).toContain('does not open a memory database');
});
