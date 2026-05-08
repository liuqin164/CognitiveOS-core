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
export declare class EventStore {
    private readonly encryptionProvider?;
    private db;
    constructor(dbPath?: string, encryptionProvider?: EncryptionProvider | undefined);
    private initializeSchema;
    append<TPayload = Record<string, unknown>>(input: AppendEventInput<TPayload>): MemoryEvent<TPayload>;
    getNextEventVersion(streamId: string): number;
    getEventsAfter(lastEventTime?: number): MemoryEvent[];
    getLatestEvent(): MemoryEvent | null;
    getEventsByStreamId(streamId: string): MemoryEvent[];
    queryEvents(page?: number, pageSize?: number, filters?: {
        streamId?: string[];
        streamType?: StreamType[];
        eventType?: MemoryEventType[];
        actorId?: string[];
        causationId?: string[];
        correlationId?: string[];
        projectId?: string[];
        startTime?: number;
        endTime?: number;
    }): EventAuditPage;
    getEventCount(): number;
    getProjectionCheckpoint(projectionName: string): ProjectionCheckpoint | null;
    upsertProjectionCheckpoint(checkpoint: ProjectionCheckpoint): void;
    close(): void;
    private encodePayload;
    private decodePayload;
}
//# sourceMappingURL=EventStore.d.ts.map