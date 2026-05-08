import type { QueryManagerLike, RuntimeSelfManifestLike } from '../types/ExtensionPoints.js';
import type { Board, BoardEvent, BoardSnapshot, BoardSnapshotOptions } from './Board.js';
import { BoardEventBus } from './BoardEventBus.js';
export declare class ProcessBoard implements Board {
    private readonly capabilityManager;
    private readonly traceManager;
    private readonly getRuntimeSelfManifest?;
    readonly id = "process";
    readonly description = "Aggregated read-only view of capabilities and recent traces";
    readonly eventBus: BoardEventBus;
    constructor(capabilityManager: QueryManagerLike, traceManager: QueryManagerLike, eventBus?: BoardEventBus, getRuntimeSelfManifest?: (() => RuntimeSelfManifestLike | null) | undefined);
    snapshot(options?: BoardSnapshotOptions): Promise<BoardSnapshot>;
    stream(callback: (event: BoardEvent) => void): () => void;
    private summarizeRuntimeSelf;
}
//# sourceMappingURL=ProcessBoard.d.ts.map