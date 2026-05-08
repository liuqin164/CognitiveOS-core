import { describe, expect, test } from 'bun:test';
import Database from 'bun:sqlite';
import { mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { SqliteVecStore, createMemoryKernel, createMemoryKernelFromEnv } from '../src/public.js';

function tempDir(): string {
  const dir = join(tmpdir(), `core-vector-backend-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

describe('Vector backends v1.12', () => {
  test('SqliteVecStore persists vectors and returns cosine-ranked nearest neighbors', () => {
    const dir = tempDir();
    const dbPath = join(dir, 'vectors.db');
    const db = new Database(dbPath);
    const store = new SqliteVecStore(db, 3);

    store.addVector('a', [1, 0, 0]);
    store.addVector('b', [0, 1, 0]);
    store.addVector('c', [0.9, 0.1, 0]);

    expect(store.search([1, 0, 0], 2).map((row) => row.id)).toEqual(['a', 'c']);
    expect(store.getStats()).toMatchObject({ backend: 'sqlite-vec', dimension: 3, size: 3 });

    store.removePoint('a');
    expect(store.search([1, 0, 0], 2).map((row) => row.id)).toEqual(['c', 'b']);
    db.close();

    const reopenedDb = new Database(dbPath);
    const reopened = new SqliteVecStore(reopenedDb, 3);
    expect(reopened.getCurrentCount()).toBe(2);
    expect(reopened.search([0, 1, 0], 1)[0]?.id).toBe('b');
    reopenedDb.close();
    rmSync(dir, { recursive: true, force: true });
  });

  test('MemoryKernel can use sqlite-vec as the default durable vector backend', async () => {
    const dir = tempDir();
    const dbPath = join(dir, 'kernel.db');
    const kernel = createMemoryKernel({ dbPath, vectorBackend: 'sqlite-vec' });

    await kernel.ingest({
      projectId: 'vector-user',
      content: 'SQLite vector backend should recall durable memory kernel facts.',
      sourceType: 'chat',
    });

    expect(kernel.vectorStore.getStats().backend).toBe('sqlite-vec');
    expect(kernel.vectorStore.getCurrentCount()).toBe(1);
    const recall = kernel.recall('durable memory kernel facts', { projectId: 'vector-user', limit: 5 });
    expect(recall.rawEvidence.some((item) => item.content.includes('SQLite vector backend'))).toBe(true);
    kernel.close();
    rmSync(dir, { recursive: true, force: true });
  });

  test('MemoryKernel applies an explicit high vector dimension to storage and deterministic embeddings', async () => {
    const dir = tempDir();
    const dbPath = join(dir, 'kernel-4096.db');
    const kernel = createMemoryKernel({
      dbPath,
      vectorBackend: 'sqlite-vec',
      vectorDimension: 4096,
    });

    const neuron = await kernel.ingest({
      projectId: 'vector-4096',
      content: 'High-dimensional vector memory should stay configurable.',
      sourceType: 'chat',
    });

    expect(neuron.coordinates.V).toHaveLength(4096);
    expect(kernel.vectorStore.getStats()).toMatchObject({
      backend: 'sqlite-vec',
      dimension: 4096,
      size: 1,
    });
    kernel.close();
    rmSync(dir, { recursive: true, force: true });
  });

  test('createMemoryKernelFromEnv keeps AB_VECTOR_DIMENSION compatible for legacy installs', async () => {
    const dir = tempDir();
    const envPath = join(dir, '.agent-brain.env');
    const dbPath = join(dir, 'kernel-env-4096.db');
    const previousDimension = process.env.AB_VECTOR_DIMENSION;
    const previousDb = process.env.COGMEM_DB;
    const previousVectorBackend = process.env.COGMEM_VECTOR_BACKEND;
    delete process.env.AB_VECTOR_DIMENSION;
    delete process.env.COGMEM_DB;
    delete process.env.COGMEM_VECTOR_BACKEND;
    await Bun.write(envPath, [
      `COGMEM_DB=${dbPath}`,
      'COGMEM_VECTOR_BACKEND=sqlite-vec',
      'AB_VECTOR_DIMENSION=4096',
    ].join('\n'));

    const kernel = createMemoryKernelFromEnv(envPath);
    try {
      const neuron = await kernel.ingest({
        projectId: 'vector-env-4096',
        content: 'Legacy env vector dimension should remain supported.',
        sourceType: 'chat',
      });

      expect(neuron.coordinates.V).toHaveLength(4096);
      expect(kernel.vectorStore.getStats()).toMatchObject({
        backend: 'sqlite-vec',
        dimension: 4096,
        size: 1,
      });
    } finally {
      kernel.close();
      if (previousDimension === undefined) delete process.env.AB_VECTOR_DIMENSION;
      else process.env.AB_VECTOR_DIMENSION = previousDimension;
      if (previousDb === undefined) delete process.env.COGMEM_DB;
      else process.env.COGMEM_DB = previousDb;
      if (previousVectorBackend === undefined) delete process.env.COGMEM_VECTOR_BACKEND;
      else process.env.COGMEM_VECTOR_BACKEND = previousVectorBackend;
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test('MemoryKernel still supports the hnswlib backend flag for existing users', () => {
    const kernel = createMemoryKernel({ vectorBackend: 'hnswlib' });

    expect(kernel.vectorStore.getStats().backend).toBe('hnswlib');
    kernel.close();
  });
});
