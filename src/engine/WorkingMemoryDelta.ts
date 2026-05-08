import type Database from 'bun:sqlite';
import type { MemoryGraph } from '../core/MemoryGraph.js';

const DEFAULT_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

export interface WorkingMemoryDeltaRecord {
  deltaId: string;
  projectId?: string;
  neuronId: string;
  createdAt: number;
  consumed?: boolean;
  payload?: unknown;
}

export class WorkingMemoryDelta {
  constructor(
    private readonly db: Database,
    private readonly memoryGraph: MemoryGraph
  ) {
    this.initSchema();
  }

  initSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS working_memory_deltas (
        delta_id TEXT PRIMARY KEY,
        project_id TEXT,
        neuron_id TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        consumed INTEGER NOT NULL DEFAULT 0 CHECK (consumed IN (0, 1)),
        payload TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_working_memory_deltas_created
        ON working_memory_deltas(created_at ASC);

      CREATE INDEX IF NOT EXISTS idx_working_memory_deltas_project
        ON working_memory_deltas(project_id, created_at ASC);
    `);
    this.ensureColumn('consumed', 'ALTER TABLE working_memory_deltas ADD COLUMN consumed INTEGER NOT NULL DEFAULT 0 CHECK (consumed IN (0, 1))');
    this.ensureColumn('payload', 'ALTER TABLE working_memory_deltas ADD COLUMN payload TEXT');
  }

  append(record: WorkingMemoryDeltaRecord): void {
    this.db.prepare(`
      INSERT OR REPLACE INTO working_memory_deltas (
        delta_id, project_id, neuron_id, created_at, consumed, payload
      ) VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      record.deltaId,
      record.projectId ?? null,
      record.neuronId,
      record.createdAt,
      record.consumed ? 1 : 0,
      typeof record.payload === 'undefined' ? null : JSON.stringify(record.payload)
    );
  }

  markConsumed(deltaId: string): void {
    this.db.prepare(`UPDATE working_memory_deltas SET consumed = 1 WHERE delta_id = ?`).run(deltaId);
  }

  cleanup(retentionMs: number = DEFAULT_RETENTION_MS): { deleted: number } {
    const cutoff = Date.now() - retentionMs;
    const rows = this.db.prepare(`
      SELECT delta_id, neuron_id, consumed
      FROM working_memory_deltas
      WHERE created_at < ?
    `).all(cutoff) as Array<{ delta_id: string; neuron_id: string; consumed: number }>;

    const deleteDelta = this.db.prepare(`DELETE FROM working_memory_deltas WHERE delta_id = ?`);
    let deleted = 0;
    for (const row of rows) {
      const neuronExists = Boolean(this.memoryGraph.getNeuron(row.neuron_id));
      if (!neuronExists && row.consumed !== 1) continue;
      deleteDelta.run(row.delta_id);
      deleted += 1;
    }
    return { deleted };
  }

  private ensureColumn(columnName: string, alterSql: string): void {
    const columns = this.db.prepare('PRAGMA table_info(working_memory_deltas)').all() as Array<{ name: string }>;
    if (!columns.some((column) => column.name === columnName)) this.db.exec(alterSql);
  }
}
