#!/usr/bin/env bun
import Database from 'bun:sqlite';
import { loadCogmemConfig, resolveCogmemConfigPath } from '../config/CogmemConfig.js';
import { NeuronEmbeddingStore } from '../embedding/NeuronEmbeddingStore.js';
import { SqliteVecStore } from '../store/SqliteVecStore.js';
function parseArgs(argv) {
    let dbPath = '';
    let configPath = '';
    let dimension;
    let dryRun = false;
    for (let index = 0; index < argv.length; index += 1) {
        const arg = argv[index];
        if (arg === '--db')
            dbPath = argv[++index] ?? '';
        else if (arg === '--config')
            configPath = argv[++index] ?? '';
        else if (arg === '--dimension')
            dimension = Number(argv[++index]);
        else if (arg === '--dry-run')
            dryRun = true;
    }
    return { dbPath: dbPath || undefined, configPath: configPath || undefined, dimension, dryRun };
}
const args = parseArgs(Bun.argv.slice(2));
const resolution = args.configPath ? resolveCogmemConfigPath({ configPath: args.configPath }) : resolveCogmemConfigPath();
const loaded = resolution.kind === 'toml' ? loadCogmemConfig({ configPath: resolution.path }) : undefined;
const dbPath = args.dbPath || loaded?.options.dbPath;
if (!dbPath) {
    throw new Error('Usage: bun run packages/core/src/bin/migrate-vectors.ts [--config <config.toml>|--db <memory.db>] [--dimension 384] [--dry-run]');
}
const db = new Database(dbPath);
db.exec('PRAGMA busy_timeout = 5000;');
try {
    const embeddingStore = new NeuronEmbeddingStore(db);
    const embeddings = embeddingStore.listLatestEmbeddings();
    const dimension = args.dimension ?? embeddings[0]?.dimensions ?? 384;
    const sqliteVec = new SqliteVecStore(db, dimension);
    const compatible = embeddings.filter((row) => row.dimensions === dimension);
    if (!args.dryRun) {
        sqliteVec.addVectors(compatible.map((row) => ({
            id: row.neuronId,
            vector: Array.from(row.vector),
        })));
    }
    console.log(JSON.stringify({
        migrated: args.dryRun ? 0 : compatible.length,
        eligible: compatible.length,
        skippedDimensionMismatch: embeddings.length - compatible.length,
        dimension,
        backend: sqliteVec.getStats().backend,
        dryRun: args.dryRun,
    }, null, 2));
}
finally {
    db.close();
}
