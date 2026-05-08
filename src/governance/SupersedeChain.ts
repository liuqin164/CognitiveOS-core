import type Database from 'bun:sqlite';

export interface SupersedeRecord {
  factId: string;
  supersededBy?: string;
  status: 'canonical' | 'superseded' | 'candidate_fact' | 'contradiction_pending';
  resolvedAt?: number;
}

export class SupersedeChain {
  constructor(private db: Database) {
    this.initSchema();
  }

  initSchema(): void {
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

  markCanonical(factId: string): void {
    this.db.prepare(`
      INSERT INTO fact_supersede_chain (fact_id, superseded_by, status, resolved_at)
      VALUES (?, NULL, 'canonical', ?)
      ON CONFLICT(fact_id) DO UPDATE SET
        superseded_by = excluded.superseded_by,
        status = excluded.status,
        resolved_at = excluded.resolved_at
    `).run(factId, Date.now());
  }

  markSuperseded(factId: string, supersededBy: string): void {
    this.db.prepare(`
      INSERT INTO fact_supersede_chain (fact_id, superseded_by, status, resolved_at)
      VALUES (?, ?, 'superseded', ?)
      ON CONFLICT(fact_id) DO UPDATE SET
        superseded_by = excluded.superseded_by,
        status = excluded.status,
        resolved_at = excluded.resolved_at
    `).run(factId, supersededBy, Date.now());
  }

  markCandidate(factId: string): void {
    this.db.prepare(`
      INSERT INTO fact_supersede_chain (fact_id, superseded_by, status, resolved_at)
      VALUES (?, NULL, 'candidate_fact', ?)
      ON CONFLICT(fact_id) DO UPDATE SET
        superseded_by = excluded.superseded_by,
        status = excluded.status,
        resolved_at = excluded.resolved_at
    `).run(factId, Date.now());
  }

  markPending(factId: string): void {
    this.db.prepare(`
      INSERT INTO fact_supersede_chain (fact_id, superseded_by, status, resolved_at)
      VALUES (?, NULL, 'contradiction_pending', ?)
      ON CONFLICT(fact_id) DO UPDATE SET
        superseded_by = excluded.superseded_by,
        status = excluded.status,
        resolved_at = excluded.resolved_at
    `).run(factId, Date.now());
  }

  getChain(factId: string): SupersedeRecord[] {
    const chain: SupersedeRecord[] = [];
    const visited = new Set<string>();
    let currentFactId: string | undefined = factId;

    while (currentFactId && !visited.has(currentFactId)) {
      visited.add(currentFactId);
      const current = this.getStatus(currentFactId);
      if (!current) break;
      chain.push(current);
      currentFactId = current.supersededBy;
    }

    return chain;
  }

  getStatus(factId: string): SupersedeRecord | null {
    const row = this.db.prepare(`
      SELECT fact_id, superseded_by, status, resolved_at
      FROM fact_supersede_chain
      WHERE fact_id = ?
    `).get(factId) as {
      fact_id: string;
      superseded_by: string | null;
      status: SupersedeRecord['status'];
      resolved_at: number | null;
    } | null;

    if (!row) return null;
    return {
      factId: row.fact_id,
      supersededBy: row.superseded_by || undefined,
      status: row.status,
      resolvedAt: row.resolved_at || undefined
    };
  }

  touchAccess(factId: string, accessedAt: number = Date.now()): void {
    this.db.prepare(`
      INSERT INTO fact_access_log (fact_id, last_accessed_at)
      VALUES (?, ?)
      ON CONFLICT(fact_id) DO UPDATE SET
        last_accessed_at = excluded.last_accessed_at
    `).run(factId, accessedAt);
  }

  getLastAccessedAt(factId: string): number | undefined {
    const row = this.db.prepare(`
      SELECT last_accessed_at
      FROM fact_access_log
      WHERE fact_id = ?
    `).get(factId) as { last_accessed_at: number } | null;

    return row?.last_accessed_at;
  }
}
