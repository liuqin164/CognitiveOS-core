import { describe, expect, it } from 'bun:test';
import type { BoardEvent } from '../src/boards/Board.js';
import { BoardEventBuffer } from '../src/boards/BoardEventBuffer.js';

function makeEvent(index: number): BoardEvent {
  return {
    boardId: index % 2 === 0 ? 'task' : 'memory',
    eventType: index % 2 === 0 ? 'task_updated' : 'memory_ingested',
    payload: { index },
    timestamp: index
  };
}

describe('BoardEventBuffer', () => {
  it('starts empty', () => {
    const buffer = new BoardEventBuffer();

    expect(buffer.size()).toBe(0);
    expect(buffer.getRecent()).toEqual([]);
  });

  it('stores events oldest-first', () => {
    const buffer = new BoardEventBuffer(5);

    buffer.push(makeEvent(1));
    buffer.push(makeEvent(2));
    buffer.push(makeEvent(3));

    expect(buffer.getRecent().map((event) => event.timestamp)).toEqual([1, 2, 3]);
  });

  it('caps size at configured max', () => {
    const buffer = new BoardEventBuffer(3);

    for (let index = 1; index <= 5; index += 1) {
      buffer.push(makeEvent(index));
    }

    expect(buffer.size()).toBe(3);
  });

  it('drops oldest events when full', () => {
    const buffer = new BoardEventBuffer(500);

    for (let index = 0; index < 600; index += 1) {
      buffer.push(makeEvent(index));
    }

    const recent = buffer.getRecent();
    expect(recent).toHaveLength(500);
    expect(recent[0]?.timestamp).toBe(100);
    expect(recent[499]?.timestamp).toBe(599);
  });

  it('returns a limited tail when limit is smaller than size', () => {
    const buffer = new BoardEventBuffer(10);

    for (let index = 1; index <= 6; index += 1) {
      buffer.push(makeEvent(index));
    }

    expect(buffer.getRecent(2).map((event) => event.timestamp)).toEqual([5, 6]);
  });

  it('returns all events when limit exceeds size', () => {
    const buffer = new BoardEventBuffer(10);

    buffer.push(makeEvent(1));
    buffer.push(makeEvent(2));

    expect(buffer.getRecent(50).map((event) => event.timestamp)).toEqual([1, 2]);
  });

  it('returns an empty list for non-positive limits', () => {
    const buffer = new BoardEventBuffer(10);

    buffer.push(makeEvent(1));

    expect(buffer.getRecent(0)).toEqual([]);
    expect(buffer.getRecent(-1)).toEqual([]);
  });

  it('keeps payload references intact', () => {
    const event = makeEvent(7);
    const buffer = new BoardEventBuffer(10);

    buffer.push(event);

    expect(buffer.getRecent(1)[0]).toBe(event);
  });

  it('reports size after rollover correctly', () => {
    const buffer = new BoardEventBuffer(2);

    buffer.push(makeEvent(1));
    buffer.push(makeEvent(2));
    buffer.push(makeEvent(3));

    expect(buffer.size()).toBe(2);
  });

  it('preserves order after rollover', () => {
    const buffer = new BoardEventBuffer(3);

    for (let index = 1; index <= 5; index += 1) {
      buffer.push(makeEvent(index));
    }

    expect(buffer.getRecent().map((event) => event.timestamp)).toEqual([3, 4, 5]);
  });
});
