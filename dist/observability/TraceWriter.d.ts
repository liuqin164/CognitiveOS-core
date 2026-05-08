import type { TraceEvent } from './TraceEvent.js';
import { TraceStore } from './TraceStore.js';
export declare class TraceWriter {
    private store;
    constructor(store: TraceStore);
    emit(event: Omit<TraceEvent, 'id' | 'timestamp'>): void;
}
//# sourceMappingURL=TraceWriter.d.ts.map