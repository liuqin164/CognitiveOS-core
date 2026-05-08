#!/usr/bin/env bun
import { loadCogmemConfig, resolveCogmemConfigPath } from '../config/CogmemConfig.js';
import { createMemoryKernelFromConfig } from '../factory.js';

function readArg(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  if (index === -1) return undefined;
  return process.argv[index + 1];
}

function ok(message: string): void {
  console.log(`OK ${message}`);
}

function warn(code: string, message: string): void {
  console.log(`WARN ${code}: ${message}`);
}

function printWarnings(diagnostics: Array<{ severity: string; code: string; message: string }>): void {
  for (const diagnostic of diagnostics) {
    if (diagnostic.severity === 'warning') warn(diagnostic.code, diagnostic.message);
  }
}

function fail(message: string): never {
  console.error(`FAIL ${message}`);
  process.exit(1);
}

const configPath = readArg('--config');
const envPath = readArg('--env-path');

if (envPath) {
  fail('--env-path is no longer supported. Use cogmem-init to create .cogmem/config.toml, then run cogmem-doctor --config <config.toml>.');
} else {
  const resolution = resolveCogmemConfigPath({ configPath });
  if (resolution.kind === 'missing') fail(`missing config file: ${resolution.path}`);
  const loaded = loadCogmemConfig({ configPath: resolution.path });
  const error = loaded.diagnostics.find((diagnostic) => diagnostic.severity === 'error');
  if (error) fail(`${error.code}: ${error.message}`);
  printWarnings(loaded.diagnostics);
  ok('configuration parsed');
  ok(`cogmem home ${loaded.homeDir}`);
  const kernel = createMemoryKernelFromConfig({ configPath: resolution.path });
  const health = kernel.getHealthStatus();
  if (health.package !== '@CognitiveOS/core') fail('unexpected package identity');
  ok(`kernel ready at ${health.dbPath}`);
  kernel.close();
}
