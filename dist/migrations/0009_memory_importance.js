export const migration_0009 = {
    version: '0009',
    description: 'memory importance and pinned neurons',
    up(db) {
        const columns = db.prepare(`PRAGMA table_info(neurons)`).all();
        const names = new Set(columns.map((column) => column.name));
        if (!names.has('importance_level')) {
            db.exec(`ALTER TABLE neurons ADD COLUMN importance_level TEXT NOT NULL DEFAULT 'normal';`);
        }
        if (!names.has('is_pinned')) {
            db.exec(`ALTER TABLE neurons ADD COLUMN is_pinned INTEGER NOT NULL DEFAULT 0 CHECK (is_pinned IN (0, 1));`);
        }
        db.exec(`CREATE INDEX IF NOT EXISTS idx_neurons_pinned ON neurons(is_pinned) WHERE is_pinned = 1;`);
    },
    down(db) {
        db.exec(`DROP INDEX IF EXISTS idx_neurons_pinned;`);
    }
};
