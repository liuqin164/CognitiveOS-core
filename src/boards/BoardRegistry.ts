import type { Board } from './Board.js';

/**
 * @public stable
 */
export class BoardRegistry {
  private boards = new Map<string, Board>();

  register(board: Board): void {
    this.boards.set(board.id, board);
  }

  get(id: string): Board | undefined {
    return this.boards.get(id);
  }

  list(): Board[] {
    return [...this.boards.values()];
  }
}
