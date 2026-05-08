import type { Migration } from '../types/Migration.js';

/**
 * v1.1 Chat Session tables
 * - chat_sessions: per-project conversation session tracker
 * - chat_turns:    ring-buffered turn history (max configured via ChatSession)
 */
export const migration_0005: Migration = {
  version: '0005',
  description: 'v1.1 chat session tables: chat_sessions, chat_turns',

  up(db) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS chat_sessions (
        session_id   TEXT PRIMARY KEY,
        project_id   TEXT,
        created_at   INTEGER NOT NULL,
        last_active  INTEGER NOT NULL,
        turn_count   INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS chat_turns (
        turn_id      TEXT PRIMARY KEY,
        session_id   TEXT NOT NULL,
        role         TEXT NOT NULL CHECK(role IN ('user','assistant')),
        content      TEXT NOT NULL,
        timestamp    INTEGER NOT NULL,
        entity_hints TEXT NOT NULL DEFAULT '[]',
        FOREIGN KEY(session_id) REFERENCES chat_sessions(session_id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_chat_turns_session_time
        ON chat_turns(session_id, timestamp DESC);

      CREATE INDEX IF NOT EXISTS idx_chat_sessions_project_active
        ON chat_sessions(project_id, last_active DESC);
    `);
  },

  down(db) {
    db.exec(`
      DROP INDEX IF EXISTS idx_chat_sessions_project_active;
      DROP INDEX IF EXISTS idx_chat_turns_session_time;
      DROP TABLE IF EXISTS chat_turns;
      DROP TABLE IF EXISTS chat_sessions;
    `);
  }
};
