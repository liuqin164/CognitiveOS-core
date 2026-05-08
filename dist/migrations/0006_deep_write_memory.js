export const migration_0006 = {
    version: '0006',
    description: 'deep write-time memory shadow tables',
    up(db) {
        db.exec(`
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
    },
    down(db) {
        db.exec(`
      DROP INDEX IF EXISTS idx_deep_write_candidates_status;
      DROP INDEX IF EXISTS idx_deep_write_candidates_run;
      DROP INDEX IF EXISTS idx_deep_write_runs_project_created;
      DROP TABLE IF EXISTS deep_write_candidates;
      DROP TABLE IF EXISTS deep_write_runs;
    `);
    }
};
