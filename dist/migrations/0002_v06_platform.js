/**
 * v0.6 Platform Delivery additions
 * - Scheduler: scheduled_jobs + scheduled_job_runs
 * - Notifications: notification_rules + notification_records
 * - Workspaces: workspaces + workspace_settings
 * - Health monitoring: agent_brain_health_checks
 */
export const migration_0002 = {
    version: '0002',
    description: 'v0.6 platform tables: scheduler, notifications, workspaces, health',
    up(db) {
        db.exec(`
      CREATE TABLE IF NOT EXISTS scheduled_jobs (
        job_id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        cron TEXT NOT NULL,
        type TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        enabled INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        last_run_at TEXT,
        next_run_at TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_enabled_next_run
        ON scheduled_jobs(enabled, next_run_at);

      CREATE TABLE IF NOT EXISTS scheduled_job_runs (
        run_id TEXT PRIMARY KEY,
        job_id TEXT NOT NULL,
        started_at TEXT NOT NULL,
        finished_at TEXT,
        success INTEGER NOT NULL,
        error TEXT,
        result_json TEXT,
        FOREIGN KEY(job_id) REFERENCES scheduled_jobs(job_id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_scheduled_job_runs_job_started
        ON scheduled_job_runs(job_id, started_at DESC);

      CREATE TABLE IF NOT EXISTS notification_rules (
        rule_id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        trigger_json TEXT NOT NULL,
        channel TEXT NOT NULL,
        channel_config_json TEXT NOT NULL,
        template TEXT NOT NULL,
        throttle_ms INTEGER,
        workspace_id TEXT,
        enabled INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_notification_rules_workspace_id
        ON notification_rules(workspace_id);

      CREATE TABLE IF NOT EXISTS notification_records (
        notification_id TEXT PRIMARY KEY,
        rule_id TEXT NOT NULL,
        dispatched_at INTEGER NOT NULL,
        channel TEXT NOT NULL,
        success INTEGER NOT NULL,
        error TEXT,
        payload_json TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_notification_records_rule_id_dispatched_at
        ON notification_records(rule_id, dispatched_at DESC);

      CREATE TABLE IF NOT EXISTS workspaces (
        id          TEXT PRIMARY KEY,
        name        TEXT NOT NULL,
        config_json TEXT NOT NULL DEFAULT '{}',
        created_at  TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS workspace_settings (
        key   TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS agent_brain_health_checks (
        probe_id   TEXT PRIMARY KEY,
        created_at TEXT NOT NULL
      );
    `);
    },
    down(db) {
        db.exec(`
      DROP TABLE IF EXISTS agent_brain_health_checks;
      DROP TABLE IF EXISTS workspace_settings;
      DROP TABLE IF EXISTS workspaces;
      DROP INDEX IF EXISTS idx_notification_records_rule_id_dispatched_at;
      DROP TABLE IF EXISTS notification_records;
      DROP INDEX IF EXISTS idx_notification_rules_workspace_id;
      DROP TABLE IF EXISTS notification_rules;
      DROP INDEX IF EXISTS idx_scheduled_job_runs_job_started;
      DROP TABLE IF EXISTS scheduled_job_runs;
      DROP INDEX IF EXISTS idx_scheduled_jobs_enabled_next_run;
      DROP TABLE IF EXISTS scheduled_jobs;
    `);
    }
};
