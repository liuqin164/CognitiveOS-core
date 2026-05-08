import { SummaryStore } from '../store/SummaryStore.js';
export const migration_0007 = {
    version: '0007',
    description: 'deep write summaries lane',
    up(db) {
        const store = new SummaryStore(db);
        store.migrateLegacyFactSummaries();
        const chatTurnColumns = db.prepare(`PRAGMA table_info(chat_turns)`).all();
        if (chatTurnColumns.length > 0 && !chatTurnColumns.some((column) => column.name === 'flags_json')) {
            db.exec(`ALTER TABLE chat_turns ADD COLUMN flags_json TEXT`);
        }
    },
    down(db) {
        db.exec(`
      DROP TRIGGER IF EXISTS deep_write_summaries_au;
      DROP TRIGGER IF EXISTS deep_write_summaries_ad;
      DROP TRIGGER IF EXISTS deep_write_summaries_ai;
      DROP TABLE IF EXISTS deep_write_summaries_fts;
      DROP INDEX IF EXISTS idx_deep_write_summaries_session;
      DROP INDEX IF EXISTS idx_deep_write_summaries_project_scope;
      DROP TABLE IF EXISTS deep_write_summaries;
    `);
    }
};
