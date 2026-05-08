#!/usr/bin/env bun
import { existsSync } from 'node:fs';
import { loadCogmemConfig, resolveCogmemConfigPath } from '../config/CogmemConfig.js';
import { parseCoreEnvConfig } from '../config/CoreEnvConfig.js';
import { createMemoryKernelFromConfig, createMemoryKernelFromEnv, loadAgentBrainEnv } from '../factory.js';
function readArg(name) {
    const index = process.argv.indexOf(name);
    if (index === -1)
        return undefined;
    return process.argv[index + 1];
}
function ok(message) {
    console.log(`OK ${message}`);
}
function warn(code, message) {
    console.log(`WARN ${code}: ${message}`);
}
function printWarnings(diagnostics) {
    for (const diagnostic of diagnostics) {
        if (diagnostic.severity === 'warning')
            warn(diagnostic.code, diagnostic.message);
    }
}
function fail(message) {
    console.error(`FAIL ${message}`);
    process.exit(1);
}
const configPath = readArg('--config');
const envPath = readArg('--env-path');
if (envPath) {
    if (!existsSync(envPath))
        fail(`missing env file: ${envPath}`);
    loadAgentBrainEnv(envPath);
    const parsed = parseCoreEnvConfig(process.env);
    const error = parsed.diagnostics.find((diagnostic) => diagnostic.severity === 'error');
    if (error)
        fail(`${error.code}: ${error.message}`);
    printWarnings(parsed.diagnostics);
    ok('configuration parsed');
    const kernel = createMemoryKernelFromEnv({ envPath, autoLoadEnv: false });
    const health = kernel.getHealthStatus();
    if (health.package !== '@CognitiveOS/core')
        fail('unexpected package identity');
    ok(`kernel ready at ${health.dbPath}`);
    kernel.close();
}
else {
    const resolution = resolveCogmemConfigPath({ configPath });
    if (resolution.kind === 'missing')
        fail(`missing config file: ${resolution.path}`);
    if (resolution.kind === 'env') {
        loadAgentBrainEnv(resolution.path);
        const parsed = parseCoreEnvConfig(process.env);
        const error = parsed.diagnostics.find((diagnostic) => diagnostic.severity === 'error');
        if (error)
            fail(`${error.code}: ${error.message}`);
        printWarnings(parsed.diagnostics);
        ok('configuration parsed');
        const kernel = createMemoryKernelFromEnv({ envPath: resolution.path, autoLoadEnv: false });
        const health = kernel.getHealthStatus();
        if (health.package !== '@CognitiveOS/core')
            fail('unexpected package identity');
        ok(`kernel ready at ${health.dbPath}`);
        kernel.close();
    }
    else {
        const loaded = loadCogmemConfig({ configPath: resolution.path });
        const error = loaded.diagnostics.find((diagnostic) => diagnostic.severity === 'error');
        if (error)
            fail(`${error.code}: ${error.message}`);
        printWarnings(loaded.diagnostics);
        ok('configuration parsed');
        ok(`cogmem home ${loaded.homeDir}`);
        const kernel = createMemoryKernelFromConfig({ configPath: resolution.path });
        const health = kernel.getHealthStatus();
        if (health.package !== '@CognitiveOS/core')
            fail('unexpected package identity');
        ok(`kernel ready at ${health.dbPath}`);
        kernel.close();
    }
}
