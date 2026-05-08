import type { QueryManagerLike } from '../types/ExtensionPoints.js';
import type { Board, BoardEvent, BoardSnapshot, BoardSnapshotOptions } from './Board.js';
import { BoardEventBus } from './BoardEventBus.js';
export declare class ContextBoard implements Board {
    private readonly contextManager;
    private readonly traceManager;
    private readonly taskId;
    readonly id = "context";
    readonly description = "Aggregated read-only view of context summary and recent traces";
    readonly eventBus: BoardEventBus;
    constructor(contextManager: QueryManagerLike, traceManager: QueryManagerLike, taskId: string, eventBus?: BoardEventBus);
    snapshot(_options?: BoardSnapshotOptions): Promise<BoardSnapshot>;
    stream(callback: (event: BoardEvent) => void): () => void;
}
//# sourceMappingURL=ContextBoard.d.ts.map