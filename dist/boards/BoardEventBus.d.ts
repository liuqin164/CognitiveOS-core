import type { BoardEvent } from './Board.js';
import type { BoardEventFilter } from './BoardEventFilter.js';
/**
 * @public experimental
 */
export declare class BoardEventBus {
    private readonly emitter;
    private readonly buffer;
    constructor(maxSize?: number);
    emit(event: BoardEvent): void;
    subscribe(filter: BoardEventFilter, callback: (event: BoardEvent) => void): () => void;
    subscribeAll(callback: (event: BoardEvent) => void): () => void;
    getRecentEvents(limit?: number): BoardEvent[];
}
//# sourceMappingURL=BoardEventBus.d.ts.map