/**
 * @public stable
 */
export class BoardRegistry {
    boards = new Map();
    register(board) {
        this.boards.set(board.id, board);
    }
    get(id) {
        return this.boards.get(id);
    }
    list() {
        return [...this.boards.values()];
    }
}
