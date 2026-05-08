import { describe, expect, test } from 'bun:test';
import Database from 'bun:sqlite';
import { migration_0009 } from '../src/migrations/index.js';

function columnExists(db: Database, column: string): boolean {
  const rows = db.prepare(`PRAGMA table_info(neurons)`).all() as Array<{ name: string }>;
  return rows.some((row) => row.name === column);
}

describe('memory importance migration', () => {
  test('adds defaults and pinned index idempotently', () => {
    const db = new Database(':memory:');
    db.exec(`
      CREATE TABLE neurons (
        id TEXT PRIMARY KEY,
        content TEXT NOT NULL
      );
    `);

    expect(() => migration_0009.up(db)).not.toThrow();
    expect(() => migration_0009.up(db)).not.toThrow();

    expect(columnExists(db, 'importance_level')).toBe(true);
    expect(columnExists(db, 'is_pinned')).toBe(true);
    const index = db.prepare(`
      SELECT name
      FROM sqlite_master
      WHERE type = 'index' AND name = 'idx_neurons_pinned'
    `).get() as { name: string } | undefined;
    expect(index?.name).toBe('idx_neurons_pinned');
    db.close();
  });
});
