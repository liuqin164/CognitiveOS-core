import type { Migration } from '../types/Migration.js';

/**
 * v0.9 Deep Self-Improvement additions
 * - New table: meta_observations (Phase 37)
 * - New columns on meta_proposals: eval_plan, risk_level, apply_mode,
 *   approved_at, rolled_back_at, previous_value (Phases 38 & 40)
 */
export const migration_0004: Migration = {
  version: '0004',
  description: 'v0.9 self-improvement: meta_observations table + meta_proposals schema upgrade',

  up(db) {
    // New table for raw observations (separate from proposal ledger)
    db.exec(`
      CREATE TABLE IF NOT EXISTS meta_observations (
        id                  TEXT PRIMARY KEY,
        observed_at         INTEGER NOT NULL,
        type                TEXT NOT NULL,
        status              TEXT NOT NULL,
        capability_id       TEXT,
        url                 TEXT,
        fact_id             TEXT,
        metric_name         TEXT,
        current_value       REAL,
        baseline_value      REAL,
        failure_rate        REAL,
        occurrence_count    INTEGER NOT NULL,
        evidence_event_ids  TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_meta_observations_type_observed
        ON meta_observations(type, observed_at DESC);

      CREATE INDEX IF NOT EXISTS idx_meta_observations_status_observed
        ON meta_observations(status, observed_at DESC);
    `);

    // Extend meta_proposals with v0.9 lifecycle fields
    // Use ALTER TABLE with try/catch pattern for idempotency
    const addColumn = (col: string, definition: string) => {
      const exists = (db.prepare(
        `SELECT COUNT(*) AS n FROM pragma_table_info('meta_proposals') WHERE name = ?`
      ).get(col) as { n: number }).n > 0;
      if (!exists) {
        db.exec(`ALTER TABLE meta_proposals ADD COLUMN ${col} ${definition}`);
      }
    };

    addColumn('eval_plan',      `TEXT DEFAULT '["memory_recall"]'`);
    addColumn('risk_level',     `TEXT DEFAULT 'medium'`);
    addColumn('apply_mode',     `TEXT DEFAULT 'patch_only'`);
    addColumn('approved_at',    `INTEGER`);
    addColumn('rolled_back_at', `INTEGER`);
    addColumn('previous_value', `TEXT`);

    // Back-fill NULLs introduced by older rows
    db.exec(`
      UPDATE meta_proposals
      SET
        eval_plan      = COALESCE(eval_plan,  '["memory_recall"]'),
        risk_level     = COALESCE(risk_level, 'medium'),
        apply_mode     = COALESCE(apply_mode, 'patch_only')
      WHERE eval_plan IS NULL OR risk_level IS NULL OR apply_mode IS NULL;
    `);
  },

  down(db) {
    // SQLite does not support DROP COLUMN before 3.35 — recreate the table
    // without the v0.9 columns as the safest portable approach.
    const v08Columns = [
      ['id', 'TEXT PRIMARY KEY'],
      ['proposed_at', 'INTEGER NOT NULL'],
      ['category', 'TEXT NOT NULL'],
      ['summary', 'TEXT NOT NULL'],
      ['evidence', 'TEXT NOT NULL'],
      ['suggested_change', 'TEXT NOT NULL'],
      ['status', 'TEXT NOT NULL'],
      ['eval_report', 'TEXT'],
      ['applied_at', 'INTEGER'],
      ['rejected_at', 'INTEGER'],
    ] as const;
    const existingColumns = new Set(
      (db.prepare(`PRAGMA table_info(meta_proposals)`).all() as Array<{ name: string }>)
        .map((column) => column.name)
    );
    const columnsToCopy = v08Columns
      .map(([name]) => name)
      .filter((name) => existingColumns.has(name));

    db.exec(`
      ALTER TABLE meta_proposals RENAME TO meta_proposals_v09_backup;
      CREATE TABLE meta_proposals (
        ${v08Columns.map(([name, definition]) => `${name} ${definition}`).join(',\n        ')}
      );
    `);

    if (columnsToCopy.length > 0) {
      db.exec(`
        INSERT INTO meta_proposals (${columnsToCopy.join(', ')})
        SELECT ${columnsToCopy.join(', ')}
        FROM meta_proposals_v09_backup;
      `);
    }

    db.exec(`
      DROP TABLE meta_proposals_v09_backup;

      DROP INDEX IF EXISTS idx_meta_observations_status_observed;
      DROP INDEX IF EXISTS idx_meta_observations_type_observed;
      DROP TABLE IF EXISTS meta_observations;
    `);
  }
};
