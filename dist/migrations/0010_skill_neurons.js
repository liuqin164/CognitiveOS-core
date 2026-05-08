export const migration_0010 = {
    version: '0010',
    description: 'skill neurons compatibility check',
    up(db) {
        const columns = db.prepare(`PRAGMA table_info(neurons)`).all();
        const names = new Set(columns.map((column) => column.name));
        if (!names.has('project_id') || !names.has('type') || !names.has('created_at') || !names.has('is_deleted')) {
            return;
        }
        db.exec(`
      CREATE INDEX IF NOT EXISTS idx_neurons_skill_project
        ON neurons(project_id, type, created_at DESC)
        WHERE type = 'skill' AND is_deleted = 0;
    `);
    },
    down(db) {
        db.exec(`DROP INDEX IF EXISTS idx_neurons_skill_project;`);
    }
};
