import { describe, expect, it } from 'bun:test';
import Database from 'bun:sqlite';
import { TraceStore } from '../src/observability/TraceStore.js';
import { TraceWriter } from '../src/observability/TraceWriter.js';

function makeWriter(): { store: TraceStore; writer: TraceWriter } {
  const db = new Database(':memory:');
  const store = new TraceStore(db);
  store.initSchema();
  return {
    store,
    writer: new TraceWriter(store)
  };
}

describe('TraceWriter', () => {
  it('emit auto-populates id and timestamp', () => {
    const { store, writer } = makeWriter();
    writer.emit({
      taskId: 'task-1',
      projectId: 'proj-1',
      eventType: 'recall.request',
      payload: { query: 'hello' }
    });

    const event = store.queryByTaskId('task-1')[0]!;
    expect(typeof event.id).toBe('string');
    expect(event.id.length).toBeGreaterThan(0);
    expect(event.timestamp).toBeGreaterThan(0);
  });

  it('emit persists the event into the store', () => {
    const { store, writer } = makeWriter();
    writer.emit({
      taskId: 'task-2',
      eventType: 'task_router.plan',
      payload: { intentType: 'factual_recall' }
    });

    expect(store.queryByTaskId('task-2')).toHaveLength(1);
  });

  it('passes through parentEventId when provided', () => {
    const { store, writer } = makeWriter();
    writer.emit({
      taskId: 'task-3',
      eventType: 'capability.result',
      payload: { capabilityId: 'web_fetch', success: true },
      parentEventId: 'parent-1'
    });

    expect(store.queryByTaskId('task-3')[0]?.parentEventId).toBe('parent-1');
  });

  it('generates distinct ids for consecutive emits', () => {
    const { store, writer } = makeWriter();
    writer.emit({ taskId: 'task-4', eventType: 'recall.request', payload: { query: 'a' } });
    writer.emit({ taskId: 'task-4', eventType: 'recall.result', payload: { factCount: 1 } });

    const ids = store.queryByTaskId('task-4').map((event) => event.id);
    expect(ids[0]).not.toBe(ids[1]);
  });

  it('retains payload data across writes', () => {
    const { store, writer } = makeWriter();
    writer.emit({
      taskId: 'task-5',
      eventType: 'task_state.transition',
      payload: { from: 'running', to: 'completed' }
    });

    expect(store.queryByTaskId('task-5')[0]?.payload).toEqual({ from: 'running', to: 'completed' });
  });
});
