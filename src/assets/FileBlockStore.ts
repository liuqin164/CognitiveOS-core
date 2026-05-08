import Database from 'bun:sqlite';
import { randomUUID } from 'crypto';
import type { FileBlockKind, FileBlockRecord, LoadedFileBlock } from './types.js';

type FileBlockRow = {
  block_id: string;
  asset_id: string;
  block_index: number;
  kind: FileBlockKind;
  text: string;
  page: number | null;
  sheet_name: string | null;
  row_start: number | null;
  row_end: number | null;
  column_start: number | null;
  column_end: number | null;
  line_start: number | null;
  line_end: number | null;
  start_ms: number | null;
  end_ms: number | null;
  selector: string | null;
  symbol_name: string | null;
  metadata_json: string | null;
  created_at: number;
};

export class FileBlockStore {
  constructor(private readonly db: Database) {
    this.initSchema();
  }

  initSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS file_blocks (
        block_id TEXT PRIMARY KEY,
        asset_id TEXT NOT NULL,
        block_index INTEGER NOT NULL,
        kind TEXT NOT NULL,
        text TEXT NOT NULL,
        page INTEGER,
        sheet_name TEXT,
        row_start INTEGER,
        row_end INTEGER,
        column_start INTEGER,
        column_end INTEGER,
        line_start INTEGER,
        line_end INTEGER,
        start_ms INTEGER,
        end_ms INTEGER,
        selector TEXT,
        symbol_name TEXT,
        metadata_json TEXT,
        created_at INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_file_blocks_asset ON file_blocks(asset_id, block_index);
      CREATE INDEX IF NOT EXISTS idx_file_blocks_page ON file_blocks(asset_id, page);
      CREATE INDEX IF NOT EXISTS idx_file_blocks_sheet ON file_blocks(asset_id, sheet_name, row_start);
    `);
  }

  replaceBlocks(assetId: string, blocks: LoadedFileBlock[]): FileBlockRecord[] {
    this.db.prepare(`DELETE FROM file_blocks WHERE asset_id = ?`).run(assetId);
    const now = Date.now();
    const stmt = this.db.prepare(`
      INSERT INTO file_blocks (
        block_id, asset_id, block_index, kind, text, page, sheet_name, row_start,
        row_end, column_start, column_end, line_start, line_end, start_ms, end_ms,
        selector, symbol_name, metadata_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    return blocks.map((block, index) => {
      const record: FileBlockRecord = {
        blockId: `block-${randomUUID()}`,
        assetId,
        blockIndex: index,
        kind: block.kind,
        text: block.text,
        page: block.page,
        sheetName: block.sheetName,
        rowStart: block.rowStart,
        rowEnd: block.rowEnd,
        columnStart: block.columnStart,
        columnEnd: block.columnEnd,
        lineStart: block.lineStart,
        lineEnd: block.lineEnd,
        startMs: block.startMs,
        endMs: block.endMs,
        selector: block.selector,
        symbolName: block.symbolName,
        metadata: block.metadata,
        createdAt: now
      };
      stmt.run(
        record.blockId,
        record.assetId,
        record.blockIndex,
        record.kind,
        record.text,
        record.page || null,
        record.sheetName || null,
        record.rowStart || null,
        record.rowEnd || null,
        record.columnStart || null,
        record.columnEnd || null,
        record.lineStart || null,
        record.lineEnd || null,
        record.startMs || null,
        record.endMs || null,
        record.selector || null,
        record.symbolName || null,
        record.metadata ? JSON.stringify(record.metadata) : null,
        record.createdAt
      );
      return record;
    });
  }

  listByAsset(assetId: string): FileBlockRecord[] {
    return (this.db.prepare(`
      SELECT * FROM file_blocks
      WHERE asset_id = ?
      ORDER BY block_index ASC
    `).all(assetId) as FileBlockRow[]).map((row) => this.mapRow(row));
  }

  listRange(assetId: string, startIndex: number, endIndex: number): FileBlockRecord[] {
    return (this.db.prepare(`
      SELECT * FROM file_blocks
      WHERE asset_id = ? AND block_index BETWEEN ? AND ?
      ORDER BY block_index ASC
    `).all(assetId, startIndex, endIndex) as FileBlockRow[]).map((row) => this.mapRow(row));
  }

  private mapRow(row: FileBlockRow): FileBlockRecord {
    return {
      blockId: row.block_id,
      assetId: row.asset_id,
      blockIndex: row.block_index,
      kind: row.kind,
      text: row.text,
      page: row.page || undefined,
      sheetName: row.sheet_name || undefined,
      rowStart: row.row_start || undefined,
      rowEnd: row.row_end || undefined,
      columnStart: row.column_start || undefined,
      columnEnd: row.column_end || undefined,
      lineStart: row.line_start || undefined,
      lineEnd: row.line_end || undefined,
      startMs: row.start_ms || undefined,
      endMs: row.end_ms || undefined,
      selector: row.selector || undefined,
      symbolName: row.symbol_name || undefined,
      metadata: row.metadata_json ? JSON.parse(row.metadata_json) : undefined,
      createdAt: row.created_at
    };
  }
}

