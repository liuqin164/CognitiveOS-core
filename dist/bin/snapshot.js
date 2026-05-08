#!/usr/bin/env bun
import { join } from 'node:path';
import { SnapshotImporter, createMemoryKernel, createMemoryKernelFromConfig } from '../public.js';
import { loadCogmemConfig, resolveCogmemConfigPath } from '../config/CogmemConfig.js';
import { config } from '../utils/Config.js';
function parseArgs(argv) {
    const args = {};
    for (let index = 0; index < argv.length; index += 1) {
        const item = argv[index];
        if (!item.startsWith('--'))
            continue;
        const key = item.slice(2);
        const next = argv[index + 1];
        if (!next || next.startsWith('--')) {
            args[key] = true;
        }
        else {
            args[key] = next;
            index += 1;
        }
    }
    return args;
}
function requireString(args, key) {
    const value = args[key];
    if (typeof value !== 'string' || value.length === 0) {
        throw new Error(`Missing required --${key}`);
    }
    return value;
}
function stringArg(args, key) {
    const value = args[key];
    return typeof value === 'string' && value.length > 0 ? value : undefined;
}
function loadConfig(args) {
    const explicit = stringArg(args, 'config');
    if (explicit)
        return loadCogmemConfig({ configPath: explicit });
    const resolution = resolveCogmemConfigPath();
    return resolution.kind === 'toml' ? loadCogmemConfig({ configPath: resolution.path }) : undefined;
}
function configuredDbPath(args, loaded) {
    return stringArg(args, 'db') || loaded?.options.dbPath || requireString(args, 'db');
}
function defaultSnapshotPath(loaded) {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    return join(loaded.paths.snapshotsDir, `memory-${stamp}.snap`);
}
async function main() {
    const [command, ...rest] = process.argv.slice(2);
    const args = parseArgs(rest);
    const loaded = loadConfig(args);
    if (command === 'export') {
        const dbPath = configuredDbPath(args, loaded);
        const outputPath = stringArg(args, 'out') || (loaded ? defaultSnapshotPath(loaded) : requireString(args, 'out'));
        const kernel = loaded && !stringArg(args, 'db')
            ? createMemoryKernelFromConfig({ configPath: loaded.configPath })
            : createMemoryKernel({ dbPath });
        const meta = await kernel.exportSnapshot(outputPath);
        kernel.close();
        console.log(JSON.stringify(meta, null, 2));
        return;
    }
    if (command === 'import') {
        const snapshotPath = requireString(args, 'snap');
        const dbPath = configuredDbPath(args, loaded);
        const importer = new SnapshotImporter({
            // Use the dimension declared in config rather than instantiating a VectorStore
            // (which would try to load hnswlib-node and emit a noisy warning when unavailable).
            expectedEmbeddingDimension: Number(args.dimension ?? config.vector.dimension),
        });
        const result = await importer.import(snapshotPath, dbPath, {
            dryRun: args['dry-run'] === true,
            overwrite: args.overwrite === true,
        });
        console.log(JSON.stringify(result, null, 2));
        return;
    }
    throw new Error('Usage: snapshot.ts export [--config <config.toml>|--db <db>] [--out <snap>] | import --snap <snap> [--config <config.toml>|--db <db>] [--dry-run] [--overwrite]');
}
main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
});
