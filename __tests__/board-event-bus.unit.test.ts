import { describe, expect, it, mock } from 'bun:test';
import type { BoardEvent } from '../src/boards/Board.js';
import { BoardEventBus } from '../src/boards/BoardEventBus.js';

function makeEvent(overrides: Partial<BoardEvent> = {}): BoardEvent {
  return {
    boardId: 'task',
    eventType: 'task_updated',
    payload: { ok: true },
    timestamp: Date.now(),
    ...overrides
  };
}

describe('BoardEventBus', () => {
  it('delivers emitted events to subscribeAll listeners synchronously', () => {
    const bus = new BoardEventBus();
    const callback = mock(() => {});
    const event = makeEvent();

    bus.subscribeAll(callback);
    bus.emit(event);

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith(event);
  });

  it('filters by boardId', () => {
    const bus = new BoardEventBus();
    const callback = mock(() => {});

    bus.subscribe({ boardId: 'memory' }, callback);
    bus.emit(makeEvent({ boardId: 'task' }));
    bus.emit(makeEvent({ boardId: 'memory', eventType: 'memory_ingested' }));

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('filters by eventType', () => {
    const bus = new BoardEventBus();
    const callback = mock(() => {});

    bus.subscribe({ eventType: 'approval_pending' }, callback);
    bus.emit(makeEvent({ eventType: 'task_created' }));
    bus.emit(makeEvent({ boardId: 'approval', eventType: 'approval_pending' }));

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('filters by boardId and eventType together', () => {
    const bus = new BoardEventBus();
    const callback = mock(() => {});

    bus.subscribe({ boardId: 'process', eventType: 'process_finished' }, callback);
    bus.emit(makeEvent({ boardId: 'process', eventType: 'process_started' }));
    bus.emit(makeEvent({ boardId: 'task', eventType: 'process_finished' }));
    bus.emit(makeEvent({ boardId: 'process', eventType: 'process_finished' }));

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('unsubscribe stops future delivery', () => {
    const bus = new BoardEventBus();
    const callback = mock(() => {});

    const unsubscribe = bus.subscribe({ boardId: 'task' }, callback);
    bus.emit(makeEvent());
    unsubscribe();
    bus.emit(makeEvent());

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('supports multiple subscribers independently', () => {
    const bus = new BoardEventBus();
    const taskCallback = mock(() => {});
    const memoryCallback = mock(() => {});

    bus.subscribe({ boardId: 'task' }, taskCallback);
    bus.subscribe({ boardId: 'memory' }, memoryCallback);
    bus.emit(makeEvent({ boardId: 'task' }));
    bus.emit(makeEvent({ boardId: 'memory', eventType: 'memory_ingested' }));

    expect(taskCallback).toHaveBeenCalledTimes(1);
    expect(memoryCallback).toHaveBeenCalledTimes(1);
  });

  it('stores recent events in oldest-first order', () => {
    const bus = new BoardEventBus();

    bus.emit(makeEvent({ timestamp: 1 }));
    bus.emit(makeEvent({ timestamp: 2 }));
    bus.emit(makeEvent({ timestamp: 3 }));

    expect(bus.getRecentEvents().map((event) => event.timestamp)).toEqual([1, 2, 3]);
  });

  it('limits recent events to requested count', () => {
    const bus = new BoardEventBus();

    for (let index = 1; index <= 5; index += 1) {
      bus.emit(makeEvent({ timestamp: index }));
    }

    expect(bus.getRecentEvents(2).map((event) => event.timestamp)).toEqual([4, 5]);
  });

  it('drops oldest events when the bus buffer exceeds capacity', () => {
    const bus = new BoardEventBus();

    for (let index = 0; index < 600; index += 1) {
      bus.emit(makeEvent({ timestamp: index }));
    }

    const events = bus.getRecentEvents();
    expect(events).toHaveLength(500);
    expect(events[0]?.timestamp).toBe(100);
    expect(events[499]?.timestamp).toBe(599);
  });

  it('returns empty recent events for non-positive limits', () => {
    const bus = new BoardEventBus();

    bus.emit(makeEvent());

    expect(bus.getRecentEvents(0)).toEqual([]);
  });
});
