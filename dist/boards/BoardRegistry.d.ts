import type { Board } from './Board.js';
/**
 * @public stable
 */
export declare class BoardRegistry {
    private boards;
    register(board: Board): void;
    get(id: string): Board | undefined;
    list(): Board[];
}
//# sourceMappingURL=BoardRegistry.d.ts.map