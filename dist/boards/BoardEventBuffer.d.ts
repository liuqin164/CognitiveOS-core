import type { BoardEvent } from './Board.js';
export declare class BoardEventBuffer {
    private readonly maxSize;
    private readonly events;
    constructor(maxSize?: number);
    push(event: BoardEvent): void;
    getRecent(limit?: number): BoardEvent[];
    size(): number;
}
//# sourceMappingURL=BoardEventBuffer.d.ts.map