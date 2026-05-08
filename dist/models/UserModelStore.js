import { confidenceFromEvidenceCount } from './UserInsight.js';
export class UserModelStore {
    db;
    constructor(db) {
        this.db = db;
        this.initSchema();
    }
    initSchema() {
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS user_insights (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        category TEXT NOT NULL,
        content TEXT NOT NULL,
        confidence REAL NOT NULL,
        initial_confidence REAL,
        confidence_delta REAL,
        evidence_neuron_ids TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        last_confirmed_at INTEGER NOT NULL,
        expires_at INTEGER,
        UNIQUE(project_id, category, content)
      );

      CREATE INDEX IF NOT EXISTS idx_user_insights_project_confidence
        ON user_insights(project_id, confidence DESC);
    `);
        this.ensureColumn('initial_confidence', 'ALTER TABLE user_insights ADD COLUMN initial_confidence REAL');
        this.ensureColumn('confidence_delta', 'ALTER TABLE user_insights ADD COLUMN confidence_delta REAL');
    }
    upsert(insight) {
        const existing = this.findByIdentity(insight.projectId, insight.category, insight.content);
        if (existing) {
            this.db.prepare(`
        UPDATE user_insights
        SET confidence = ?,
            initial_confidence = COALESCE(initial_confidence, ?),
            confidence_delta = ?,
            evidence_neuron_ids = ?,
            last_confirmed_at = ?,
            expires_at = ?
        WHERE id = ?
      `).run(insight.confidence, existing.initialConfidence ?? existing.confidence, insight.confidence - existing.confidence, JSON.stringify(Array.from(new Set([...existing.evidenceNeuronIds, ...insight.evidenceNeuronIds]))), insight.lastConfirmedAt, insight.expiresAt ?? null, existing.id);
            return;
        }
        this.db.prepare(`
      INSERT INTO user_insights (
        id, project_id, category, content, confidence, evidence_neuron_ids,
        initial_confidence, confidence_delta, created_at, last_confirmed_at, expires_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(insight.id, insight.projectId, insight.category, insight.content, insight.confidence, JSON.stringify(Array.from(new Set(insight.evidenceNeuronIds))), insight.initialConfidence ?? insight.confidence, insight.confidenceDelta ?? 0, insight.createdAt, insight.lastConfirmedAt, insight.expiresAt ?? null);
    }
    query(projectId, options = {}) {
        const clauses = ['project_id = ?'];
        const params = [projectId];
        if (options.categories?.length) {
            clauses.push(`category IN (${options.categories.map(() => '?').join(', ')})`);
            params.push(...options.categories);
        }
        if (options.minConfidence !== undefined) {
            clauses.push('confidence >= ?');
            params.push(options.minConfidence);
        }
        params.push(options.limit ?? 20);
        const rows = this.db.prepare(`
      SELECT *
      FROM user_insights
      WHERE ${clauses.join(' AND ')}
      ORDER BY confidence DESC, last_confirmed_at DESC, created_at DESC
      LIMIT ?
    `).all(...params);
        return rows.map((row) => this.mapRow(row));
    }
    reinforce(insightId, newEvidenceNeuronIds) {
        const current = this.get(insightId);
        if (!current)
            return;
        const evidence = Array.from(new Set([...current.evidenceNeuronIds, ...newEvidenceNeuronIds]));
        this.db.prepare(`
      UPDATE user_insights
      SET evidence_neuron_ids = ?,
          confidence = ?,
          initial_confidence = COALESCE(initial_confidence, ?),
          confidence_delta = ?,
          last_confirmed_at = ?
      WHERE id = ?
    `).run(JSON.stringify(evidence), confidenceFromEvidenceCount(evidence.length), current.initialConfidence ?? current.confidence, confidenceFromEvidenceCount(evidence.length) - current.confidence, Date.now(), insightId);
    }
    evictExpired(now = Date.now()) {
        const result = this.db.prepare(`
      DELETE FROM user_insights
      WHERE expires_at IS NOT NULL AND expires_at < ?
    `).run(now);
        return result.changes;
    }
    get(insightId) {
        const row = this.db.prepare(`SELECT * FROM user_insights WHERE id = ?`).get(insightId);
        return row ? this.mapRow(row) : null;
    }
    findByIdentity(projectId, category, content) {
        const row = this.db.prepare(`
      SELECT * FROM user_insights
      WHERE project_id = ? AND category = ? AND content = ?
    `).get(projectId, category, content);
        return row ? this.mapRow(row) : null;
    }
    mapRow(row) {
        return {
            id: row.id,
            projectId: row.project_id,
            category: row.category,
            content: row.content,
            confidence: row.confidence,
            initialConfidence: row.initial_confidence ?? undefined,
            confidenceDelta: row.confidence_delta ?? undefined,
            evidenceNeuronIds: parseEvidence(row.evidence_neuron_ids),
            createdAt: row.created_at,
            lastConfirmedAt: row.last_confirmed_at,
            expiresAt: row.expires_at ?? undefined
        };
    }
    ensureColumn(columnName, alterSql) {
        const columns = this.db.prepare('PRAGMA table_info(user_insights)').all();
        if (!columns.some((column) => column.name === columnName))
            this.db.exec(alterSql);
    }
}
function parseEvidence(value) {
    try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string') : [];
    }
    catch {
        return [];
    }
}
