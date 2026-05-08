import type { Board, BoardSnapshot, BoardSnapshotOptions, BoardEvent } from './Board.js';
import { BoardEventBus } from './BoardEventBus.js';
export declare class ReasoningTraceBoard implements Board {
    private readonly eventBus;
    readonly id = "reasoning_trace";
    readonly description = "LLM iterative reasoning and tool call trace";
    constructor(eventBus?: BoardEventBus);
    snapshot(options?: BoardSnapshotOptions): Promise<BoardSnapshot>;
    stream(callback: (event: BoardEvent) => void): () => void;
}
//# sourceMappingURL=ReasoningTraceBoard.d.ts.map