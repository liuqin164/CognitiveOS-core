import type { QueryManagerLike } from '../types/ExtensionPoints.js';
import type { Board, BoardEvent, BoardSnapshot, BoardSnapshotOptions } from './Board.js';
import { BoardEventBus } from './BoardEventBus.js';
export declare class ApprovalBoard implements Board {
    private readonly approvalManager;
    private readonly taskManager;
    readonly id = "approval";
    readonly description = "Aggregated read-only view of pending approvals and tasks";
    readonly eventBus: BoardEventBus;
    constructor(approvalManager: QueryManagerLike, taskManager: QueryManagerLike, eventBus?: BoardEventBus);
    snapshot(_options?: BoardSnapshotOptions): Promise<BoardSnapshot>;
    stream(callback: (event: BoardEvent) => void): () => void;
}
//# sourceMappingURL=ApprovalBoard.d.ts.map