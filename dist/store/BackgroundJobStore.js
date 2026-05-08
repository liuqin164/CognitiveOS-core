import Database from 'bun:sqlite';
export class BackgroundJobStore {
    db;
    constructor(dbPath = ':memory:') {
        this.db = new Database(dbPath);
        this.initializeSchema();
    }
    initializeSchema() {
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS background_jobs (
        job_name TEXT PRIMARY KEY,
        interval_ms INTEGER NOT NULL,
        next_run_at INTEGER NOT NULL,
        last_run_at INTEGER,
        last_status TEXT NOT NULL DEFAULT 'idle',
        last_error TEXT,
        is_enabled INTEGER NOT NULL DEFAULT 1,
        lease_owner TEXT,
        lease_expires_at INTEGER,
        metadata_json TEXT,
        updated_at INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_background_jobs_next_run
        ON background_jobs(is_enabled, next_run_at ASC);
    `);
        const columns = this.db.prepare(`PRAGMA table_info(background_jobs)`).all();
        const columnNames = new Set(columns.map((column) => column.name));
        if (!columnNames.has('lease_owner')) {
            this.db.exec(`ALTER TABLE background_jobs ADD COLUMN lease_owner TEXT;`);
        }
        if (!columnNames.has('lease_expires_at')) {
            this.db.exec(`ALTER TABLE background_jobs ADD COLUMN lease_expires_at INTEGER;`);
        }
    }
    upsertJob(input) {
        const existing = this.getJob(input.jobName);
        const updatedAt = input.updatedAt ?? Date.now();
        this.db.prepare(`
      INSERT OR REPLACE INTO background_jobs (
        job_name, interval_ms, next_run_at, last_run_at, last_status,
        last_error, is_enabled, lease_owner, lease_expires_at, metadata_json, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(input.jobName, input.intervalMs, input.nextRunAt ?? existing?.nextRunAt ?? (updatedAt + input.intervalMs), input.lastRunAt ?? existing?.lastRunAt ?? null, input.lastStatus ?? existing?.lastStatus ?? 'idle', input.lastError ?? existing?.lastError ?? null, input.isEnabled === undefined ? (existing?.isEnabled ?? true ? 1 : 0) : (input.isEnabled ? 1 : 0), existing?.leaseOwner ?? null, existing?.leaseExpiresAt ?? null, JSON.stringify({
            ...(existing?.metadata || {}),
            ...(input.metadata || {})
        }), updatedAt);
    }
    getJob(jobName) {
        const row = this.db.prepare(`
      SELECT * FROM background_jobs WHERE job_name = ?
    `).get(jobName);
        return row ? this.mapRow(row) : null;
    }
    listDueJobs(now = Date.now()) {
        const rows = this.db.prepare(`
      SELECT * FROM background_jobs
      WHERE is_enabled = 1
        AND next_run_at <= ?
      ORDER BY next_run_at ASC, job_name ASC
    `).all(now);
        return rows.map((row) => this.mapRow(row));
    }
    markStarted(jobName, startedAt = Date.now()) {
        this.db.prepare(`
      UPDATE background_jobs
      SET last_status = 'running', updated_at = ?
      WHERE job_name = ?
    `).run(startedAt, jobName);
    }
    acquireLease(jobName, ownerId, now = Date.now(), leaseMs = 30_000) {
        const result = this.db.prepare(`
      UPDATE background_jobs
      SET lease_owner = ?,
          lease_expires_at = ?,
          last_status = 'running',
          updated_at = ?
      WHERE job_name = ?
        AND is_enabled = 1
        AND next_run_at <= ?
        AND (lease_expires_at IS NULL OR lease_expires_at <= ? OR lease_owner = ?)
    `).run(ownerId, now + leaseMs, now, jobName, now, now, ownerId);
        return Number(result.changes || 0) > 0;
    }
    renewLease(jobName, ownerId, now = Date.now(), leaseMs = 30_000) {
        const result = this.db.prepare(`
      UPDATE background_jobs
      SET lease_expires_at = ?, updated_at = ?
      WHERE job_name = ?
        AND lease_owner = ?
    `).run(now + leaseMs, now, jobName, ownerId);
        return Number(result.changes || 0) > 0;
    }
    releaseLease(jobName, ownerId) {
        this.db.prepare(`
      UPDATE background_jobs
      SET lease_owner = NULL, lease_expires_at = NULL, updated_at = ?
      WHERE job_name = ? AND lease_owner = ?
    `).run(Date.now(), jobName, ownerId);
    }
    markFinished(jobName, input) {
        const finishedAt = input.finishedAt ?? Date.now();
        const existing = this.getJob(jobName);
        this.db.prepare(`
      UPDATE background_jobs
      SET last_run_at = ?,
          next_run_at = ?,
          last_status = 'succeeded',
          last_error = NULL,
          lease_owner = NULL,
          lease_expires_at = NULL,
          metadata_json = ?,
          updated_at = ?
      WHERE job_name = ?
    `).run(finishedAt, input.nextRunAt, JSON.stringify({
            ...(existing?.metadata || {}),
            ...(input.metadata || {})
        }), finishedAt, jobName);
    }
    markFailed(jobName, input) {
        const failedAt = input.failedAt ?? Date.now();
        const existing = this.getJob(jobName);
        this.db.prepare(`
      UPDATE background_jobs
      SET next_run_at = ?,
          last_status = 'failed',
          last_error = ?,
          lease_owner = NULL,
          lease_expires_at = NULL,
          metadata_json = ?,
          updated_at = ?
      WHERE job_name = ?
    `).run(input.nextRunAt ?? existing?.nextRunAt ?? failedAt, input.error, JSON.stringify({
            ...(existing?.metadata || {}),
            ...(input.metadata || {})
        }), failedAt, jobName);
    }
    close() {
        this.db.close();
    }
    mapRow(row) {
        return {
            jobName: row.job_name,
            intervalMs: row.interval_ms,
            nextRunAt: row.next_run_at,
            lastRunAt: row.last_run_at || undefined,
            lastStatus: row.last_status,
            lastError: row.last_error || undefined,
            isEnabled: Boolean(row.is_enabled),
            leaseOwner: row.lease_owner || undefined,
            leaseExpiresAt: row.lease_expires_at || undefined,
            metadata: row.metadata_json ? JSON.parse(row.metadata_json) : undefined,
            updatedAt: row.updated_at
        };
    }
}
