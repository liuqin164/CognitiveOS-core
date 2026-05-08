import { EventEmitter } from 'node:events';
import type { BoardEvent } from './Board.js';
import type { BoardEventFilter } from './BoardEventFilter.js';
import { BoardEventBuffer } from './BoardEventBuffer.js';

const BOARD_EVENT_NAME = 'board:event';

/**
 * @public experimental
 */
export class BoardEventBus {
  private readonly emitter = new EventEmitter();
  private readonly buffer: BoardEventBuffer;

  constructor(maxSize: number = 500) {
    this.buffer = new BoardEventBuffer(maxSize);
  }

  emit(event: BoardEvent): void {
    this.buffer.push(event);
    this.emitter.emit(BOARD_EVENT_NAME, event);
  }

  subscribe(filter: BoardEventFilter, callback: (event: BoardEvent) => void): () => void {
    const listener = (event: BoardEvent) => {
      if (filter.boardId && filter.boardId !== event.boardId) {
        return;
      }

      if (filter.eventType && filter.eventType !== event.eventType) {
        return;
      }

      callback(event);
    };

    this.emitter.on(BOARD_EVENT_NAME, listener);
    return () => {
      this.emitter.off(BOARD_EVENT_NAME, listener);
    };
  }

  subscribeAll(callback: (event: BoardEvent) => void): () => void {
    return this.subscribe({}, callback);
  }

  getRecentEvents(limit: number = 500): BoardEvent[] {
    return this.buffer.getRecent(limit);
  }
}
