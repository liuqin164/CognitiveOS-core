import { EventEmitter } from 'node:events';
import { BoardEventBuffer } from './BoardEventBuffer.js';
const BOARD_EVENT_NAME = 'board:event';
/**
 * @public experimental
 */
export class BoardEventBus {
    emitter = new EventEmitter();
    buffer;
    constructor(maxSize = 500) {
        this.buffer = new BoardEventBuffer(maxSize);
    }
    emit(event) {
        this.buffer.push(event);
        this.emitter.emit(BOARD_EVENT_NAME, event);
    }
    subscribe(filter, callback) {
        const listener = (event) => {
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
    subscribeAll(callback) {
        return this.subscribe({}, callback);
    }
    getRecentEvents(limit = 500) {
        return this.buffer.getRecent(limit);
    }
}
