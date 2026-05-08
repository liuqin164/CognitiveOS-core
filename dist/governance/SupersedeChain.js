export class SupersedeChain {
    db;
    constructor(db) {
        this.db = db;
        this.initSchema();
    }
    initSchema() {
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS fact_supersede_chain (
        fact_id TEXT PRIMARY KEY,
        superseded_by TEXT,
        status TEXT NOT NULL,
        resolved_at INTEGER
      );

      CREATE TABLE IF NOT EXISTS fact_access_log (
        fact_id TEXT PRIMARY KEY,
        last_accessed_at INTEGER NOT NULL
      );
    `);
    }
    markCanonical(factId) {
        this.db.prepare(`
      INSERT INTO fact_supersede_chain (fact_id, superseded_by, status, resolved_at)
      VALUES (?, NULL, 'canonical', ?)
      ON CONFLICT(fact_id) DO UPDATE SET
        superseded_by = excluded.superseded_by,
        status = excluded.status,
        resolved_at = excluded.resolved_at
    `).run(factId, Date.now());
    }
    markSuperseded(factId, supersededBy) {
        this.db.prepare(`
      INSERT INTO fact_supersede_chain (fact_id, superseded_by, status, resolved_at)
      VALUES (?, ?, 'superseded', ?)
      ON CONFLICT(fact_id) DO UPDATE SET
        superseded_by = excluded.superseded_by,
        status = excluded.status,
        resolved_at = excluded.resolved_at
    `).run(factId, supersededBy, Date.now());
    }
    markCandidate(factId) {
        this.db.prepare(`
      INSERT INTO fact_supersede_chain (fact_id, superseded_by, status, resolved_at)
      VALUES (?, NULL, 'candidate_fact', ?)
      ON CONFLICT(fact_id) DO UPDATE SET
        superseded_by = excluded.superseded_by,
        status = excluded.status,
        resolved_at = excluded.resolved_at
    `).run(factId, Date.now());
    }
    markPending(factId) {
        this.db.prepare(`
      INSERT INTO fact_supersede_chain (fact_id, superseded_by, status, resolved_at)
      VALUES (?, NULL, 'contradiction_pending', ?)
      ON CONFLICT(fact_id) DO UPDATE SET
        superseded_by = excluded.superseded_by,
        status = excluded.status,
        resolved_at = excluded.resolved_at
    `).run(factId, Date.now());
    }
    getChain(factId) {
        const chain = [];
        const visited = new Set();
        let currentFactId = factId;
        while (currentFactId && !visited.has(currentFactId)) {
            visited.add(currentFactId);
            const current = this.getStatus(currentFactId);
            if (!current)
                break;
            chain.push(current);
            currentFactId = current.supersededBy;
        }
        return chain;
    }
    getStatus(factId) {
        const row = this.db.prepare(`
      SELECT fact_id, superseded_by, status, resolved_at
      FROM fact_supersede_chain
      WHERE fact_id = ?
    `).get(factId);
        if (!row)
            return null;
        return {
            factId: row.fact_id,
            supersededBy: row.superseded_by || undefined,
            status: row.status,
            resolvedAt: row.resolved_at || undefined
        };
    }
    touchAccess(factId, accessedAt = Date.now()) {
        this.db.prepare(`
      INSERT INTO fact_access_log (fact_id, last_accessed_at)
      VALUES (?, ?)
      ON CONFLICT(fact_id) DO UPDATE SET
        last_accessed_at = excluded.last_accessed_at
    `).run(factId, accessedAt);
    }
    getLastAccessedAt(factId) {
        const row = this.db.prepare(`
      SELECT last_accessed_at
      FROM fact_access_log
      WHERE fact_id = ?
    `).get(factId);
        return row?.last_accessed_at;
    }
}
