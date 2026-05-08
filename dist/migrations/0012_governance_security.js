export const migration_0012 = {
    version: '0012',
    description: 'governance audit log for forgetUser and security actions',
    up(db) {
        db.exec(`
      CREATE TABLE IF NOT EXISTS governance_audit_log (
        audit_id TEXT PRIMARY KEY,
        action TEXT NOT NULL,
        project_id TEXT,
        reason TEXT,
        details_json TEXT,
        created_at INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_governance_audit_project
        ON governance_audit_log(project_id, created_at DESC);
    `);
    },
    down(db) {
        db.exec(`DROP INDEX IF EXISTS idx_governance_audit_project;`);
        db.exec(`DROP TABLE IF EXISTS governance_audit_log;`);
    }
};
