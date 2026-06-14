import Database from 'bun:sqlite';
import { pathToFileURL } from 'node:url';

import type {
  AdaptedSource,
  AdapterWindow,
  SourceAdapter,
  SourceAdapterDiagnostic,
  SourceAdapterRecord,
  SourceDefinition,
  SourceFileSnapshot,
  SourceActorRole,
} from '../types.js';
import { computeStableHash, parseLooseTimestamp } from '../types.js';

type LooseRow = Record<string, unknown> & { __rowid?: number };

const TEXT_COLUMNS = [
  'content',
  'text',
  'message',
  'body',
  'message_text',
  'raw',
  'payload',
];
const ROLE_COLUMNS = ['role', 'sender_role', 'sender', 'author', 'speaker', 'type'];
const SESSION_COLUMNS = ['session_id', 'sessionId', 'conversation_id', 'conversationId', 'thread_id', 'threadId', 'chat_id', 'chatId'];
const MESSAGE_ID_COLUMNS = ['id', 'message_id', 'messageId', 'uuid'];
const MESSAGE_TIME_COLUMNS = [
  'occurredAt',
  'occurred_at',
  'timestamp',
  'createdAt',
  'created_at',
  'sentAt',
  'sent_at',
  'time',
];
const INSERT_TIME_COLUMNS = ['InsertTime', 'insertTime', 'insert_time', 'imported_at', 'importedAt'];

export class HermesStateDbAdapter implements SourceAdapter {
  readonly kind = 'hermes_state_db' as const;
  private readonly adapterVersion = 'hermes-state-db-v1';

  adapt(source: SourceDefinition, snapshot: SourceFileSnapshot, window?: AdapterWindow): AdaptedSource {
    const diagnostics: SourceAdapterDiagnostic[] = [];
    const records: SourceAdapterRecord[] = [];
    let db: Database | undefined;

    try {
      db = openReadonlySqlite(source.sourcePath);
      if (!hasTable(db, 'messages')) {
        diagnostics.push(this.diagnostic(source, 'error', 'hermes_state_db_missing_messages_table', 'Hermes state database does not contain a messages table.'));
        return this.result(source, snapshot, records, diagnostics);
      }

      const columns = tableColumns(db, 'messages');
      const rows = db.prepare(`SELECT rowid AS __rowid, * FROM ${quoteIdentifier('messages')}`).all() as LooseRow[];
      const mapped = rows
        .map((row, index) => this.toRecord(source, snapshot, row, columns, index, diagnostics))
        .filter((record): record is SourceAdapterRecord => Boolean(record))
        .filter((record) => !window || (record.timestamp >= window.start && record.timestamp < window.end))
        .sort((a, b) => a.timestamp - b.timestamp || numericMetadata(a, 'sourceOffset') - numericMetadata(b, 'sourceOffset'));

      records.push(...mapped);
    } catch (error) {
      diagnostics.push(this.diagnostic(
        source,
        'error',
        'hermes_state_db_read_failed',
        `Failed to read Hermes state database: ${error instanceof Error ? error.message : String(error)}`,
      ));
    } finally {
      db?.close();
    }

    return this.result(source, snapshot, records, diagnostics);
  }

  private toRecord(
    source: SourceDefinition,
    snapshot: SourceFileSnapshot,
    row: LooseRow,
    columns: string[],
    index: number,
    diagnostics: SourceAdapterDiagnostic[],
  ): SourceAdapterRecord | undefined {
    const text = pickText(row, TEXT_COLUMNS);
    if (!text) return undefined;

    const rowId = typeof row.__rowid === 'number' ? row.__rowid : index + 1;
    const role = normalizeRole(pickText(row, ROLE_COLUMNS));
    const sessionId = pickText(row, SESSION_COLUMNS) || `hermes-state-db-${computeStableHash([source.sourcePath]).slice(0, 10)}`;
    const messageId = pickText(row, MESSAGE_ID_COLUMNS) || String(rowId);
    const timeSource = pickTimestampSource(row);
    const timestamp = parseTimestampValue(timeSource.value, snapshot.fileMtimeMs + index);
    const sourceOffset = index + 1;
    const recordHash = computeStableHash([
      source.sourceId,
      sessionId,
      messageId,
      timestamp,
      role,
      text,
    ]);

    if (timeSource.kind === 'insert_time_fallback') {
      diagnostics.push(this.diagnostic(
        source,
        'warning',
        'hermes_state_db_insert_time_fallback',
        `Message ${messageId} did not expose occurredAt/timestamp; using InsertTime/import time fallback.`,
      ));
    }

    return {
      recordId: `hermesmsg-${recordHash.slice(0, 16)}`,
      turnId: computeStableHash([source.sourceId, sessionId, 'turn', rowId]),
      kind: 'conversation_message',
      role,
      text,
      timestamp,
      tags: ['hermes', 'state_db', 'conversation'],
      confidenceHint: 0.92,
      sourceTypeHint: role === 'agent' ? 'llm_inference' : role === 'user' ? 'user_input' : 'external_tool',
      metadata: {
        hermesStateDbTable: 'messages',
        hermesStateDbRowId: rowId,
        hermesStateDbMessageId: messageId,
        hermesStateDbColumns: columns,
        timestampSource: timeSource.column,
        threadId: sessionId,
        sessionId,
        sourceOffset,
        threadSeq: sourceOffset,
        turnSeq: sourceOffset,
        eventOrdinal: 1,
        orderingConfidence: 'high',
      },
      provenance: {
        sourceId: source.sourceId,
        sourcePath: source.sourcePath,
        sourceType: this.kind,
        adapterVersion: this.adapterVersion,
        fileHash: snapshot.fileHash,
        fileMtimeMs: snapshot.fileMtimeMs,
        recordHash,
        reliabilityClass: 'raw_utterance',
        sourceOffset,
        orderingConfidence: 'high',
      },
    };
  }

  private result(
    source: SourceDefinition,
    snapshot: SourceFileSnapshot,
    records: SourceAdapterRecord[],
    diagnostics: SourceAdapterDiagnostic[],
  ): AdaptedSource {
    return {
      source,
      snapshot: {
        sourceId: snapshot.sourceId,
        adapterKind: snapshot.adapterKind,
        sourcePath: snapshot.sourcePath,
        projectId: snapshot.projectId,
        fileHash: snapshot.fileHash,
        fileMtimeMs: snapshot.fileMtimeMs,
        fileSize: snapshot.fileSize,
        readAt: snapshot.readAt,
      },
      records,
      diagnostics,
    };
  }

  private diagnostic(
    source: SourceDefinition,
    severity: SourceAdapterDiagnostic['severity'],
    code: string,
    message: string,
  ): SourceAdapterDiagnostic {
    return {
      severity,
      code,
      message,
      filePath: source.sourcePath,
      adapterKind: this.kind,
    };
  }
}

function hasTable(db: Database, tableName: string): boolean {
  const row = db.prepare(`
    SELECT name
    FROM sqlite_master
    WHERE type = 'table' AND lower(name) = lower(?)
    LIMIT 1
  `).get(tableName) as { name?: string } | null;
  return Boolean(row?.name);
}

function tableColumns(db: Database, tableName: string): string[] {
  return (db.prepare(`PRAGMA table_info(${quoteIdentifier(tableName)})`).all() as Array<{ name: string }>)
    .map((row) => row.name);
}

function quoteIdentifier(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

function pickText(row: LooseRow, columns: string[]): string | undefined {
  const lowerMap = new Map(Object.keys(row).map((key) => [key.toLowerCase(), key]));
  for (const column of columns) {
    const actual = lowerMap.get(column.toLowerCase());
    if (!actual) continue;
    const text = textFromValue(row[actual]);
    if (text) return text;
  }
  return undefined;
}

function textFromValue(value: unknown): string | undefined {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
      try {
        const parsed = JSON.parse(trimmed) as unknown;
        const nested = textFromStructuredValue(parsed);
        if (nested) return nested;
      } catch {
        return trimmed;
      }
    }
    return trimmed;
  }
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return textFromStructuredValue(value);
}

function textFromStructuredValue(value: unknown): string | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const record = value as Record<string, unknown>;
  for (const key of TEXT_COLUMNS) {
    const nested = textFromValue(record[key]);
    if (nested) return nested;
  }
  return undefined;
}

function normalizeRole(value: string | undefined): SourceActorRole {
  const normalized = (value || '').trim().toLowerCase();
  if (['assistant', 'agent', 'ai', 'bot', 'model'].includes(normalized)) return 'agent';
  if (['system', 'sys', 'tool'].includes(normalized)) return 'system';
  if (['narrator', 'note', 'memo'].includes(normalized)) return 'narrator';
  return 'user';
}

function pickTimestampSource(row: LooseRow): { value?: string; column?: string; kind: 'message_time' | 'insert_time_fallback' | 'missing' } {
  const lowerMap = new Map(Object.keys(row).map((key) => [key.toLowerCase(), key]));
  for (const column of MESSAGE_TIME_COLUMNS) {
    const actual = lowerMap.get(column.toLowerCase());
    if (!actual) continue;
    const value = textFromValue(row[actual]);
    if (value) return { value, column: actual, kind: 'message_time' };
  }
  for (const column of INSERT_TIME_COLUMNS) {
    const actual = lowerMap.get(column.toLowerCase());
    if (!actual) continue;
    const value = textFromValue(row[actual]);
    if (value) return { value, column: actual, kind: 'insert_time_fallback' };
  }
  return { kind: 'missing' };
}

function parseTimestampValue(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const trimmed = value.trim();
  if (/^\d+(?:\.\d+)?$/.test(trimmed)) {
    const numeric = Number(trimmed);
    return numeric < 10_000_000_000 ? numeric * 1000 : numeric;
  }
  return parseLooseTimestamp(trimmed, fallback);
}

function openReadonlySqlite(sourcePath: string): Database {
  const attempts = [
    sourcePath,
    `${pathToFileURL(sourcePath).href}?immutable=1`,
  ];
  let lastError: unknown;
  for (const attempt of attempts) {
    let db: Database | undefined;
    try {
      db = new Database(attempt, { readonly: true, create: false });
      db.prepare(`SELECT name FROM sqlite_master LIMIT 1`).get();
      return db;
    } catch (error) {
      lastError = error;
      db?.close();
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

function numericMetadata(record: SourceAdapterRecord, key: string): number {
  const value = record.metadata?.[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}
