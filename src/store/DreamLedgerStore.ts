import type Database from 'bun:sqlite';

export interface DreamBacklogStatus {
  projectId?: string;
  rawEventCount: number;
  dreamedRawCount: number;
  undreamedRawCount: number;
  dreamCoverageRate: number;
  lastDreamedGlobalSeq?: number;
  lastDreamedAt?: number;
  updatedAt?: number;
}

export class DreamLedgerStore {
  constructor(private readonly db: Database) {
    this.initializeSchema();
  }

  getStatus(projectId?: string): DreamBacklogStatus {
    const state = this.getState(projectId);
    const lastDreamedGlobalSeq = state?.lastDreamedGlobalSeq;
    const rawEventCount = this.countRawEvents(projectId);
    const dreamedRawCount = lastDreamedGlobalSeq === undefined
      ? 0
      : this.countRawEvents(projectId, { maxGlobalSeq: lastDreamedGlobalSeq });
    const undreamedRawCount = Math.max(0, rawEventCount - dreamedRawCount);
    return {
      projectId,
      rawEventCount,
      dreamedRawCount,
      undreamedRawCount,
      dreamCoverageRate: rawEventCount === 0 ? 1 : dreamedRawCount / rawEventCount,
      lastDreamedGlobalSeq,
      lastDreamedAt: state?.lastDreamedAt,
      updatedAt: state?.updatedAt,
    };
  }

  markDreamed(projectId: string | undefined, globalSeq: number, dreamedAt: number = Date.now()): DreamBacklogStatus {
    const key = this.projectKey(projectId);
    this.db.prepare(`
      INSERT INTO dream_ledger_state (project_key, project_id, last_dreamed_global_seq, last_dreamed_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(project_key) DO UPDATE SET
        last_dreamed_global_seq = excluded.last_dreamed_global_seq,
        last_dreamed_at = excluded.last_dreamed_at,
        updated_at = excluded.updated_at
    `).run(key, projectId || null, globalSeq, dreamedAt, dreamedAt);
    return this.getStatus(projectId);
  }

  private initializeSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS dream_ledger_state (
        project_key TEXT PRIMARY KEY,
        project_id TEXT,
        last_dreamed_global_seq INTEGER,
        last_dreamed_at INTEGER,
        updated_at INTEGER NOT NULL
      );
    `);
  }

  private getState(projectId?: string): {
    lastDreamedGlobalSeq?: number;
    lastDreamedAt?: number;
    updatedAt?: number;
  } | null {
    const row = this.db.prepare(`
      SELECT last_dreamed_global_seq, last_dreamed_at, updated_at
      FROM dream_ledger_state
      WHERE project_key = ?
    `).get(this.projectKey(projectId)) as {
      last_dreamed_global_seq?: number;
      last_dreamed_at?: number;
      updated_at?: number;
    } | null;
    if (!row) return null;
    return {
      lastDreamedGlobalSeq: row.last_dreamed_global_seq || undefined,
      lastDreamedAt: row.last_dreamed_at || undefined,
      updatedAt: row.updated_at || undefined,
    };
  }

  private countRawEvents(projectId?: string, options: { maxGlobalSeq?: number } = {}): number {
    const conditions = [`event_type = 'RAW_EVENT_RECORDED'`];
    const params: Array<string | number> = [];
    if (projectId) {
      conditions.push('project_id = ?');
      params.push(projectId);
    }
    if (options.maxGlobalSeq !== undefined) {
      conditions.push('global_seq <= ?');
      params.push(options.maxGlobalSeq);
    }
    const row = this.db.prepare(`
      SELECT COUNT(*) AS count
      FROM memory_events
      WHERE ${conditions.join(' AND ')}
    `).get(...params) as { count: number } | null;
    return row?.count || 0;
  }

  private projectKey(projectId?: string): string {
    return projectId || '__global__';
  }
}
