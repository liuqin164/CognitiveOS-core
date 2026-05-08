/**
 * v0.7 Full Service Platform additions
 * - Session runtime tracking: user_session_runtime
 * - Web session tokens: web_session_tokens
 * - Archived sessions: archived_sessions
 */
export const migration_0003 = {
    version: '0003',
    description: 'v0.7 session tables: user_session_runtime, web_session_tokens, archived_sessions',
    up(db) {
        db.exec(`
      CREATE TABLE IF NOT EXISTS user_session_runtime (
        session_id    TEXT PRIMARY KEY,
        user_id       TEXT NOT NULL,
        workspace_id  TEXT NOT NULL,
        active        INTEGER NOT NULL DEFAULT 1,
        last_active_at INTEGER NOT NULL,
        created_at    INTEGER NOT NULL,
        updated_at    INTEGER NOT NULL,
        archived_at   INTEGER,
        FOREIGN KEY(session_id) REFERENCES user_sessions(session_id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS web_session_tokens (
        token       TEXT PRIMARY KEY,
        session_id  TEXT NOT NULL UNIQUE,
        created_at  INTEGER NOT NULL,
        updated_at  INTEGER NOT NULL,
        FOREIGN KEY(session_id) REFERENCES user_sessions(session_id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS archived_sessions (
        session_id        TEXT PRIMARY KEY,
        channels          TEXT NOT NULL DEFAULT '[]',
        active_task_ids   TEXT NOT NULL DEFAULT '[]',
        recent_entity_ids TEXT NOT NULL DEFAULT '[]',
        created_at        INTEGER NOT NULL,
        updated_at        INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_archived_sessions_updated
        ON archived_sessions(updated_at);
    `);
    },
    down(db) {
        db.exec(`
      DROP INDEX IF EXISTS idx_archived_sessions_updated;
      DROP TABLE IF EXISTS archived_sessions;
      DROP TABLE IF EXISTS web_session_tokens;
      DROP TABLE IF EXISTS user_session_runtime;
    `);
    }
};
