# Concurrent Access Contract

`@CognitiveOS/core` uses SQLite as the durable source of truth. The v1.12 vector backend keeps vectors in the same database file, so the same concurrency rules apply to memory, facts, embeddings, and vector rows.

## Supported

- Multiple readers may open the same database concurrently.
- One writer process may ingest, consolidate, re-embed, import snapshots, or run vector migrations at a time.
- Short-lived CLI readers such as `re-embed status` are safe while the kernel is running.
- SQLite busy timeout is set to 5000 ms for core-owned database handles.

## Not Supported

- Two writer kernels ingesting into the same database path at the same time.
- Running `importSnapshot()` against a started kernel. The API throws `KernelRunningError` before replacing a live database file.
- Running `migrate-vectors` while another process is writing embeddings or neurons.
- Sharing one `MemoryKernel` instance across workers without external serialization.

## Operational Guidance

- Use a single long-lived writer per database file.
- Use snapshot export/import for backups and promotion between environments.
- Run `bun run packages/core/src/bin/migrate-vectors.ts --db <memory.db> --dry-run` before migrating persisted embeddings into `vector_index`.
- Prefer `vectorBackend: 'sqlite-vec'` for durable local deployments. Use `vectorBackend: 'hnswlib'` only when you explicitly need the legacy in-memory index behavior.
