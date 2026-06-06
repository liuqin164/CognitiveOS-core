export class DreamLedgerStore {
    db;
    constructor(db) {
        this.db = db;
        this.initializeSchema();
    }
    getStatus(projectId) {
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
    markDreamed(projectId, globalSeq, dreamedAt = Date.now()) {
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
    initializeSchema() {
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
    getState(projectId) {
        const row = this.db.prepare(`
      SELECT last_dreamed_global_seq, last_dreamed_at, updated_at
      FROM dream_ledger_state
      WHERE project_key = ?
    `).get(this.projectKey(projectId));
        if (!row)
            return null;
        return {
            lastDreamedGlobalSeq: row.last_dreamed_global_seq || undefined,
            lastDreamedAt: row.last_dreamed_at || undefined,
            updatedAt: row.updated_at || undefined,
        };
    }
    countRawEvents(projectId, options = {}) {
        const conditions = [`event_type = 'RAW_EVENT_RECORDED'`];
        const params = [];
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
    `).get(...params);
        return row?.count || 0;
    }
    projectKey(projectId) {
        return projectId || '__global__';
    }
}
