import { randomUUID } from 'crypto';
export class DeepWriteCandidateStore {
    db;
    constructor(db) {
        this.db = db;
        this.initSchema();
    }
    initSchema() {
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS deep_write_runs (
        run_id TEXT PRIMARY KEY,
        project_id TEXT,
        session_id TEXT,
        source_neuron_ids_json TEXT NOT NULL,
        model_provider TEXT,
        model_name TEXT,
        mode TEXT NOT NULL,
        prompt_hash TEXT NOT NULL,
        output_hash TEXT NOT NULL,
        status TEXT NOT NULL,
        error TEXT,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS deep_write_candidates (
        candidate_id TEXT PRIMARY KEY,
        run_id TEXT NOT NULL,
        candidate_type TEXT NOT NULL,
        status TEXT NOT NULL,
        confidence REAL NOT NULL,
        content_json TEXT NOT NULL,
        evidence_json TEXT NOT NULL,
        promotion_target_type TEXT,
        promotion_target_id TEXT,
        created_at INTEGER NOT NULL,
        FOREIGN KEY(run_id) REFERENCES deep_write_runs(run_id)
      );

      CREATE INDEX IF NOT EXISTS idx_deep_write_runs_project_created
        ON deep_write_runs(project_id, created_at DESC);

      CREATE INDEX IF NOT EXISTS idx_deep_write_candidates_run
        ON deep_write_candidates(run_id);

      CREATE INDEX IF NOT EXISTS idx_deep_write_candidates_status
        ON deep_write_candidates(status, candidate_type);
    `);
    }
    insertRun(input) {
        const record = {
            ...input,
            runId: input.runId || randomUUID(),
            createdAt: input.createdAt || Date.now()
        };
        this.db.prepare(`
      INSERT INTO deep_write_runs (
        run_id, project_id, session_id, source_neuron_ids_json, model_provider,
        model_name, mode, prompt_hash, output_hash, status, error, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(record.runId, record.projectId || null, record.sessionId || null, JSON.stringify(record.sourceNeuronIds), record.modelProvider || null, record.modelName || null, record.mode, record.promptHash, record.outputHash, record.status, record.error || null, record.createdAt);
        return record;
    }
    insertCandidates(inputs) {
        const records = inputs.map((input) => ({
            ...input,
            candidateId: input.candidateId || randomUUID(),
            createdAt: input.createdAt || Date.now()
        }));
        const stmt = this.db.prepare(`
      INSERT INTO deep_write_candidates (
        candidate_id, run_id, candidate_type, status, confidence, content_json,
        evidence_json, promotion_target_type, promotion_target_id, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
        this.db.transaction(() => {
            for (const record of records) {
                stmt.run(record.candidateId, record.runId, record.candidateType, record.status, record.confidence, JSON.stringify(record.content), JSON.stringify(record.evidence), record.promotionTargetType || null, record.promotionTargetId || null, record.createdAt);
            }
        })();
        return records;
    }
    getRun(runId) {
        const row = this.db.prepare(`
      SELECT *
      FROM deep_write_runs
      WHERE run_id = ?
    `).get(runId);
        return row ? this.mapRun(row) : null;
    }
    listCandidatesByRun(runId) {
        const rows = this.db.prepare(`
      SELECT *
      FROM deep_write_candidates
      WHERE run_id = ?
      ORDER BY created_at ASC, candidate_id ASC
    `).all(runId);
        return rows.map((row) => this.mapCandidate(row));
    }
    getCandidate(candidateId) {
        const row = this.db.prepare(`
      SELECT *
      FROM deep_write_candidates
      WHERE candidate_id = ?
    `).get(candidateId);
        return row ? this.mapCandidate(row) : null;
    }
    listCandidatesByStatus(statuses, options) {
        if (statuses.length === 0)
            return [];
        const params = [...statuses];
        let sql = `
      SELECT *
      FROM deep_write_candidates
      WHERE status IN (${statuses.map(() => '?').join(', ')})
    `;
        if (options?.candidateTypes?.length) {
            sql += ` AND candidate_type IN (${options.candidateTypes.map(() => '?').join(', ')})`;
            params.push(...options.candidateTypes);
        }
        sql += ` ORDER BY created_at ASC, candidate_id ASC LIMIT ?`;
        params.push(options?.limit ?? 100);
        const rows = this.db.prepare(sql).all(...params);
        return rows.map((row) => this.mapCandidate(row));
    }
    listCandidates(options = {}) {
        const params = [];
        const conditions = [];
        let sql = `
      SELECT c.*
      FROM deep_write_candidates c
      JOIN deep_write_runs r ON r.run_id = c.run_id
    `;
        if (options.statuses?.length) {
            conditions.push(`c.status IN (${options.statuses.map(() => '?').join(', ')})`);
            params.push(...options.statuses);
        }
        if (options.candidateTypes?.length) {
            conditions.push(`c.candidate_type IN (${options.candidateTypes.map(() => '?').join(', ')})`);
            params.push(...options.candidateTypes);
        }
        if (options.projectId) {
            conditions.push('r.project_id = ?');
            params.push(options.projectId);
        }
        if (options.runId) {
            conditions.push('c.run_id = ?');
            params.push(options.runId);
        }
        if (conditions.length)
            sql += ` WHERE ${conditions.join(' AND ')}`;
        sql += ` ORDER BY c.created_at ASC, c.candidate_id ASC LIMIT ?`;
        params.push(options.limit ?? 100);
        const rows = this.db.prepare(sql).all(...params);
        return rows.map((row) => this.mapCandidate(row));
    }
    countCandidates(options = {}) {
        const params = [];
        const conditions = [];
        let sql = `
      SELECT COUNT(*) AS count
      FROM deep_write_candidates c
      JOIN deep_write_runs r ON r.run_id = c.run_id
    `;
        if (options.statuses?.length) {
            conditions.push(`c.status IN (${options.statuses.map(() => '?').join(', ')})`);
            params.push(...options.statuses);
        }
        if (options.candidateTypes?.length) {
            conditions.push(`c.candidate_type IN (${options.candidateTypes.map(() => '?').join(', ')})`);
            params.push(...options.candidateTypes);
        }
        if (options.projectId) {
            conditions.push('r.project_id = ?');
            params.push(options.projectId);
        }
        if (options.runId) {
            conditions.push('c.run_id = ?');
            params.push(options.runId);
        }
        if (conditions.length)
            sql += ` WHERE ${conditions.join(' AND ')}`;
        const row = this.db.prepare(sql).get(...params);
        return row?.count || 0;
    }
    updateCandidateStatus(candidateId, status, promotionTarget) {
        this.db.prepare(`
      UPDATE deep_write_candidates
      SET status = ?,
          promotion_target_type = COALESCE(?, promotion_target_type),
          promotion_target_id = COALESCE(?, promotion_target_id)
      WHERE candidate_id = ?
    `).run(status, promotionTarget?.type || null, promotionTarget?.id || null, candidateId);
    }
    mapRun(row) {
        return {
            runId: row.run_id,
            projectId: row.project_id || undefined,
            sessionId: row.session_id || undefined,
            sourceNeuronIds: JSON.parse(row.source_neuron_ids_json || '[]'),
            modelProvider: row.model_provider || undefined,
            modelName: row.model_name || undefined,
            mode: row.mode,
            promptHash: row.prompt_hash,
            outputHash: row.output_hash,
            status: row.status,
            error: row.error || undefined,
            createdAt: row.created_at
        };
    }
    mapCandidate(row) {
        return {
            candidateId: row.candidate_id,
            runId: row.run_id,
            candidateType: row.candidate_type,
            status: row.status,
            confidence: row.confidence,
            content: JSON.parse(row.content_json || '{}'),
            evidence: JSON.parse(row.evidence_json || '[]'),
            promotionTargetType: row.promotion_target_type || undefined,
            promotionTargetId: row.promotion_target_id || undefined,
            createdAt: row.created_at
        };
    }
}
