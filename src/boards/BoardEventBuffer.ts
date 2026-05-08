import type { BoardEvent } from './Board.js';

export class BoardEventBuffer {
  private readonly events: BoardEvent[] = [];

  constructor(private readonly maxSize: number = 500) {}

  push(event: BoardEvent): void {
    this.events.push(event);
    if (this.events.length > this.maxSize) {
      this.events.shift();
    }
  }

  getRecent(limit: number = this.maxSize): BoardEvent[] {
    if (limit <= 0) {
      return [];
    }

    return this.events.slice(-Math.min(limit, this.events.length));
  }

  size(): number {
    return this.events.length;
  }
}
