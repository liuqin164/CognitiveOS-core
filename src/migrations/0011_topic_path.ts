import type { Migration } from '../types/Migration.js';

export const migration_0011: Migration = {
  version: '0011',
  description: 'memory topic namespace hierarchy',

  up(db) {
    const columns = db.prepare(`PRAGMA table_info(neurons)`).all() as Array<{ name: string }>;
    const names = new Set(columns.map((column) => column.name));
    if (columns.length === 0) return;
    if (!names.has('topic_path')) {
      db.exec(`ALTER TABLE neurons ADD COLUMN topic_path TEXT;`);
    }
    if (names.has('project_id')) {
      db.exec(`CREATE INDEX IF NOT EXISTS idx_neurons_topic_path ON neurons(project_id, topic_path);`);
    }
  },

  down(db) {
    db.exec(`DROP INDEX IF EXISTS idx_neurons_topic_path;`);
  }
};
