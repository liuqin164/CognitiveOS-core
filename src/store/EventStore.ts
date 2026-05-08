import Database from 'bun:sqlite';
import { createHash, randomUUID } from 'crypto';
import type { EncryptionProvider } from '../encryption/index.js';
import type { EventAuditPage, MemoryEvent, MemoryEventType, StreamType } from '../types/index.js';

export interface ProjectionCheckpoint {
  projectionName: string;
  lastEventId?: string;
  lastEventTime?: number;
  lastRebuildAt?: number;
  lastFullCount: number;
  lastChecksum?: string;
  status: 'idle' | 'building' | 'ready' | 'degraded' | 'failed';
  metadata?: Record<string, unknown>;
}

export interface AppendEventInput<TPayload = Record<string, unknown>> {
  streamId: string;
  streamType: StreamType;
  eventType: MemoryEventType;
  eventVersion?: number;
  projectId?: string;
  actorId?: string;
  causationId?: string;
  correlationId?: string;
  sourceNeuronId?: string;
  occurredAt?: number;
  payload: TPayload;
}

export class EventStore {
  private db: Database;

  constructor(dbPath: string = ':memory:', private readonly encryptionProvider?: EncryptionProvider) {
    this.db = new Database(dbPath);
    this.initializeSchema();
  }

  private initializeSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS memory_events (
        event_id TEXT PRIMARY KEY,
        stream_id TEXT NOT NULL,
        stream_type TEXT NOT NULL,
        event_type TEXT NOT NULL,
        event_version INTEGER NOT NULL,
        project_id TEXT,
        actor_id TEXT,
        causation_id TEXT,
        correlation_id TEXT,
        source_neuron_id TEXT,
        occurred_at INTEGER NOT NULL,
        payload_json TEXT NOT NULL,
        payload_hash TEXT NOT NULL,
        created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
        UNIQUE (stream_id, event_version)
      );

      CREATE INDEX IF NOT EXISTS idx_memory_events_stream
        ON memory_events(stream_type, stream_id, event_version);

      CREATE INDEX IF NOT EXISTS idx_memory_events_type_time
        ON memory_events(event_type, occurred_at DESC);

      CREATE TABLE IF NOT EXISTS vector_projection_state (
        projection_name TEXT PRIMARY KEY,
        last_event_id TEXT,
        last_event_time INTEGER,
        last_rebuild_at INTEGER,
        last_full_count INTEGER NOT NULL DEFAULT 0,
        last_checksum TEXT,
        status TEXT NOT NULL DEFAULT 'idle',
        metadata_json TEXT
      );
    `);
  }

  append<TPayload = Record<string, unknown>>(input: AppendEventInput<TPayload>): MemoryEvent<TPayload> {
    const eventVersion = input.eventVersion ?? this.getNextEventVersion(input.streamId);
    const occurredAt = input.occurredAt ?? Date.now();
    const payloadJson = JSON.stringify(input.payload);
    const storedPayloadJson = this.encodePayload(payloadJson);
    const event: MemoryEvent<TPayload> = {
      eventId: `evt-${randomUUID()}`,
      streamId: input.streamId,
      streamType: input.streamType,
      eventType: input.eventType,
      eventVersion,
      projectId: input.projectId,
      actorId: input.actorId,
      causationId: input.causationId,
      correlationId: input.correlationId,
      sourceNeuronId: input.sourceNeuronId,
      occurredAt,
      payload: input.payload,
      payloadHash: createHash('sha256').update(payloadJson).digest('hex'),
      createdAt: Date.now()
    };

    this.db.prepare(`
      INSERT INTO memory_events (
        event_id, stream_id, stream_type, event_type, event_version, project_id,
        actor_id, causation_id, correlation_id, source_neuron_id, occurred_at,
        payload_json, payload_hash, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      event.eventId,
      event.streamId,
      event.streamType,
      event.eventType,
      event.eventVersion,
      event.projectId || null,
      event.actorId || null,
      event.causationId || null,
      event.correlationId || null,
      event.sourceNeuronId || null,
      event.occurredAt,
      storedPayloadJson,
      event.payloadHash,
      event.createdAt
    );

    return event;
  }

  getNextEventVersion(streamId: string): number {
    const row = this.db.prepare(`
      SELECT COALESCE(MAX(event_version), 0) AS version
      FROM memory_events
      WHERE stream_id = ?
    `).get(streamId) as { version: number } | null;
    return (row?.version || 0) + 1;
  }

  getEventsAfter(lastEventTime?: number): MemoryEvent[] {
    const rows = this.db.prepare(`
      SELECT event_id, stream_id, stream_type, event_type, event_version, project_id,
             actor_id, causation_id, correlation_id, source_neuron_id, occurred_at,
             payload_json, payload_hash, created_at
      FROM memory_events
      WHERE (? IS NULL OR occurred_at > ?)
      ORDER BY occurred_at ASC, event_id ASC
    `).all(lastEventTime || null, lastEventTime || null) as any[];

    return rows.map((row) => ({
      eventId: row.event_id,
      streamId: row.stream_id,
      streamType: row.stream_type,
      eventType: row.event_type,
      eventVersion: row.event_version,
      projectId: row.project_id || undefined,
      actorId: row.actor_id || undefined,
      causationId: row.causation_id || undefined,
      correlationId: row.correlation_id || undefined,
      sourceNeuronId: row.source_neuron_id || undefined,
      occurredAt: row.occurred_at,
      payload: JSON.parse(this.decodePayload(row.payload_json)),
      payloadHash: row.payload_hash,
      createdAt: row.created_at
    }));
  }

  getLatestEvent(): MemoryEvent | null {
    const row = this.db.prepare(`
      SELECT event_id, stream_id, stream_type, event_type, event_version, project_id,
             actor_id, causation_id, correlation_id, source_neuron_id, occurred_at,
             payload_json, payload_hash, created_at
      FROM memory_events
      ORDER BY occurred_at DESC, event_id DESC
      LIMIT 1
    `).get() as any;

    if (!row) return null;

    return {
      eventId: row.event_id,
      streamId: row.stream_id,
      streamType: row.stream_type,
      eventType: row.event_type,
      eventVersion: row.event_version,
      projectId: row.project_id || undefined,
      actorId: row.actor_id || undefined,
      causationId: row.causation_id || undefined,
      correlationId: row.correlation_id || undefined,
      sourceNeuronId: row.source_neuron_id || undefined,
      occurredAt: row.occurred_at,
      payload: JSON.parse(this.decodePayload(row.payload_json)),
      payloadHash: row.payload_hash,
      createdAt: row.created_at
    };
  }

  getEventsByStreamId(streamId: string): MemoryEvent[] {
    const rows = this.db.prepare(`
      SELECT event_id, stream_id, stream_type, event_type, event_version, project_id,
             actor_id, causation_id, correlation_id, source_neuron_id, occurred_at,
             payload_json, payload_hash, created_at
      FROM memory_events
      WHERE stream_id = ?
      ORDER BY occurred_at ASC, event_id ASC
    `).all(streamId) as any[];

    return rows.map((row) => ({
      eventId: row.event_id,
      streamId: row.stream_id,
      streamType: row.stream_type,
      eventType: row.event_type,
      eventVersion: row.event_version,
      projectId: row.project_id || undefined,
      actorId: row.actor_id || undefined,
      causationId: row.causation_id || undefined,
      correlationId: row.correlation_id || undefined,
      sourceNeuronId: row.source_neuron_id || undefined,
      occurredAt: row.occurred_at,
      payload: JSON.parse(this.decodePayload(row.payload_json)),
      payloadHash: row.payload_hash,
      createdAt: row.created_at
    }));
  }

  queryEvents(
    page: number = 1,
    pageSize: number = 20,
    filters?: {
      streamId?: string[];
      streamType?: StreamType[];
      eventType?: MemoryEventType[];
      actorId?: string[];
      causationId?: string[];
      correlationId?: string[];
      projectId?: string[];
      startTime?: number;
      endTime?: number;
    }
  ): EventAuditPage {
    const safePage = Math.max(1, page);
    const safePageSize = Math.max(1, pageSize);
    const offset = (safePage - 1) * safePageSize;
    const conditions: string[] = [];
    const params: Array<string | number> = [];

    if (filters?.streamId?.length) {
      conditions.push(`stream_id IN (${filters.streamId.map(() => '?').join(', ')})`);
      params.push(...filters.streamId);
    }
    if (filters?.streamType?.length) {
      conditions.push(`stream_type IN (${filters.streamType.map(() => '?').join(', ')})`);
      params.push(...filters.streamType);
    }
    if (filters?.eventType?.length) {
      conditions.push(`event_type IN (${filters.eventType.map(() => '?').join(', ')})`);
      params.push(...filters.eventType);
    }
    if (filters?.actorId?.length) {
      conditions.push(`actor_id IN (${filters.actorId.map(() => '?').join(', ')})`);
      params.push(...filters.actorId);
    }
    if (filters?.causationId?.length) {
      conditions.push(`causation_id IN (${filters.causationId.map(() => '?').join(', ')})`);
      params.push(...filters.causationId);
    }
    if (filters?.correlationId?.length) {
      conditions.push(`correlation_id IN (${filters.correlationId.map(() => '?').join(', ')})`);
      params.push(...filters.correlationId);
    }
    if (filters?.projectId?.length) {
      conditions.push(`project_id IN (${filters.projectId.map(() => '?').join(', ')})`);
      params.push(...filters.projectId);
    }
    if (filters?.startTime !== undefined) {
      conditions.push('occurred_at >= ?');
      params.push(filters.startTime);
    }
    if (filters?.endTime !== undefined) {
      conditions.push('occurred_at <= ?');
      params.push(filters.endTime);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const totalRow = this.db.prepare(`
      SELECT COUNT(*) AS count FROM memory_events ${where}
    `).get(...params) as { count: number } | null;
    const rows = this.db.prepare(`
      SELECT event_id, stream_id, stream_type, event_type, event_version, project_id,
             actor_id, causation_id, correlation_id, source_neuron_id, occurred_at,
             payload_json, payload_hash, created_at
      FROM memory_events
      ${where}
      ORDER BY occurred_at DESC, event_id DESC
      LIMIT ? OFFSET ?
    `).all(...params, safePageSize, offset) as any[];

    return {
      page: safePage,
      pageSize: safePageSize,
      total: totalRow?.count || 0,
      records: rows.map((row) => ({
        eventId: row.event_id,
        streamId: row.stream_id,
        streamType: row.stream_type,
        eventType: row.event_type,
        eventVersion: row.event_version,
        projectId: row.project_id || undefined,
        actorId: row.actor_id || undefined,
        causationId: row.causation_id || undefined,
        correlationId: row.correlation_id || undefined,
        sourceNeuronId: row.source_neuron_id || undefined,
        occurredAt: row.occurred_at,
        payload: JSON.parse(this.decodePayload(row.payload_json)),
        payloadHash: row.payload_hash,
        createdAt: row.created_at
      })),
      appliedFilters: {
        streamId: filters?.streamId,
        streamType: filters?.streamType,
        eventType: filters?.eventType,
        actorId: filters?.actorId,
        causationId: filters?.causationId,
        correlationId: filters?.correlationId,
        projectId: filters?.projectId,
        startTime: filters?.startTime,
        endTime: filters?.endTime
      }
    };
  }

  getEventCount(): number {
    const row = this.db.prepare(`SELECT COUNT(*) AS count FROM memory_events`).get() as { count: number } | null;
    return row?.count || 0;
  }

  getProjectionCheckpoint(projectionName: string): ProjectionCheckpoint | null {
    const row = this.db.prepare(`SELECT * FROM vector_projection_state WHERE projection_name = ?`).get(projectionName) as any;
    if (!row) return null;

    return {
      projectionName: row.projection_name,
      lastEventId: row.last_event_id || undefined,
      lastEventTime: row.last_event_time || undefined,
      lastRebuildAt: row.last_rebuild_at || undefined,
      lastFullCount: row.last_full_count || 0,
      lastChecksum: row.last_checksum || undefined,
      status: row.status,
      metadata: row.metadata_json ? JSON.parse(row.metadata_json) : undefined
    };
  }

  upsertProjectionCheckpoint(checkpoint: ProjectionCheckpoint): void {
    this.db.prepare(`
      INSERT OR REPLACE INTO vector_projection_state (
        projection_name, last_event_id, last_event_time, last_rebuild_at,
        last_full_count, last_checksum, status, metadata_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      checkpoint.projectionName,
      checkpoint.lastEventId || null,
      checkpoint.lastEventTime || null,
      checkpoint.lastRebuildAt || null,
      checkpoint.lastFullCount,
      checkpoint.lastChecksum || null,
      checkpoint.status,
      checkpoint.metadata ? JSON.stringify(checkpoint.metadata) : null
    );
  }

  close(): void {
    this.db.close();
  }

  private encodePayload(payloadJson: string): string {
    return this.encryptionProvider?.encrypt(payloadJson) ?? payloadJson;
  }

  private decodePayload(payloadJson: string): string {
    return this.encryptionProvider?.decrypt(payloadJson) ?? payloadJson;
  }
}
