import type { QueryManagerLike } from '../types/ExtensionPoints.js';
import type { Board, BoardEvent, BoardSnapshot, BoardSnapshotOptions } from './Board.js';
import { BoardEventBus } from './BoardEventBus.js';
export declare class MemoryBoard implements Board {
    private readonly memoryManager;
    readonly id = "memory";
    readonly description = "Aggregated read-only view of recent memory facts";
    readonly eventBus: BoardEventBus;
    constructor(memoryManager: QueryManagerLike, eventBus?: BoardEventBus);
    snapshot(options?: BoardSnapshotOptions): Promise<BoardSnapshot>;
    stream(callback: (event: BoardEvent) => void): () => void;
}
//# sourceMappingURL=MemoryBoard.d.ts.map