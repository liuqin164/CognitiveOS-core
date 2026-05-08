import type { TraceEvent } from './TraceEvent.js';
import { TraceStore } from './TraceStore.js';
export declare class TraceQuery {
    private store;
    constructor(store: TraceStore);
    forTask(taskId: string): TraceEvent[];
    forProject(projectId: string, limit?: number): TraceEvent[];
    decisionChain(rootEventId: string): TraceEvent[];
    summary(taskId: string): {
        eventCount: number;
        eventTypes: string[];
        durationMs: number;
    };
}
//# sourceMappingURL=TraceQuery.d.ts.map