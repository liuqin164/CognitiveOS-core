import type { QueryManagerLike } from '../types/ExtensionPoints.js';
import type { Board, BoardEvent, BoardSnapshot, BoardSnapshotOptions } from './Board.js';
import { BoardEventBus } from './BoardEventBus.js';
export declare class TaskBoard implements Board {
    private readonly taskManager;
    private readonly approvalManager;
    readonly id = "task";
    readonly description = "Aggregated read-only view of tasks and pending approvals";
    readonly eventBus: BoardEventBus;
    constructor(taskManager: QueryManagerLike, approvalManager: QueryManagerLike, eventBus?: BoardEventBus);
    snapshot(_options?: BoardSnapshotOptions): Promise<BoardSnapshot>;
    stream(callback: (event: BoardEvent) => void): () => void;
}
//# sourceMappingURL=TaskBoard.d.ts.map