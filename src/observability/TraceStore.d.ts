import type Database from 'bun:sqlite';
import type { TraceEvent, TraceEventType } from './TraceEvent.js';
export declare class TraceStore {
    private db;
    constructor(db: Database);
    initSchema(): void;
    append(event: TraceEvent): void;
    queryByTaskId(taskId: string): TraceEvent[];
    queryByEventType(eventType: TraceEventType): TraceEvent[];
    queryByProjectId(projectId: string): TraceEvent[];
    getDecisionChain(eventId: string): TraceEvent[];
    private mapRow;
    private parsePayload;
}
//# sourceMappingURL=TraceStore.d.ts.map