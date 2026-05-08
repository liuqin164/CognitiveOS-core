import { describe, expect, it } from 'bun:test';
import Database from 'bun:sqlite';
import type { TraceEvent, TraceEventType } from '../src/observability/TraceEvent.js';
import { TraceStore } from '../src/observability/TraceStore.js';
import { MetaObservationCollector } from '../src/meta/MetaObservationCollector.js';

function makeStore(): TraceStore {
  const store = new TraceStore(new Database(':memory:'));
  store.initSchema();
  return store;
}

function appendEvent(
  store: TraceStore,
  eventType: TraceEventType,
  payload: Record<string, unknown>,
  overrides: Partial<TraceEvent> = {}
): string {
  const id = overrides.id ?? crypto.randomUUID();
  store.append({
    id,
    timestamp: overrides.timestamp ?? Date.now(),
    taskId: overrides.taskId,
    projectId: overrides.projectId,
    eventType,
    payload,
    parentEventId: overrides.parentEventId
  });
  return id;
}

describe('MetaObservationCollector', () => {
  it('returns an empty array for an empty TraceStore', () => {
    const collector = new MetaObservationCollector(makeStore());
    expect(collector.collectPatterns()).toEqual([]);
  });

  it('collects repeated_approval_reject when the same capability appears three times', () => {
    const store = makeStore();
    appendEvent(store, 'approval.request', { capabilityId: 'shell_exec' });
    appendEvent(store, 'approval.request', { capabilityId: 'shell_exec' });
    appendEvent(store, 'approval.request', { capabilityId: 'shell_exec' });

    const patterns = new MetaObservationCollector(store).collectPatterns();
    expect(patterns).toHaveLength(1);
    expect(patterns[0]?.type).toBe('repeated_approval_reject');
    expect(patterns[0]?.capabilityId).toBe('shell_exec');
  });

  it('does not emit a pattern when occurrences are below minOccurrences', () => {
    const store = makeStore();
    appendEvent(store, 'approval.request', { capabilityId: 'shell_exec' });
    appendEvent(store, 'approval.request', { capabilityId: 'shell_exec' });

    expect(new MetaObservationCollector(store).collectPatterns({ minOccurrences: 3 })).toEqual([]);
  });

  it('collects repeated_url_filter when the same url is filtered three times', () => {
    const store = makeStore();
    appendEvent(store, 'observation_filter.decision', { url: 'https://example.com', shouldIngest: false });
    appendEvent(store, 'observation_filter.decision', { url: 'https://example.com', shouldIngest: false });
    appendEvent(store, 'observation_filter.decision', { url: 'https://example.com', shouldIngest: false });

    const patterns = new MetaObservationCollector(store).collectPatterns();
    expect(patterns).toHaveLength(1);
    expect(patterns[0]?.type).toBe('repeated_url_filter');
    expect(patterns[0]?.url).toBe('https://example.com');
  });

  it('collects both memory patterns when the same fact is promoted three times', () => {
    const store = makeStore();
    appendEvent(store, 'memory.promote', { factId: 'fact-1' });
    appendEvent(store, 'memory.promote', { factId: 'fact-1' });
    appendEvent(store, 'memory.promote', { factId: 'fact-1' });

    const patterns = new MetaObservationCollector(store).collectPatterns();
    expect(patterns.map((pattern) => pattern.type)).toEqual([
      'flip_flop_supersede',
      'repeated_decay_after_promote'
    ]);
    expect(patterns.every((pattern) => pattern.factId === 'fact-1')).toBe(true);
  });

  it('preserves evidenceEventIds from the underlying trace rows', () => {
    const store = makeStore();
    const ids = [
      appendEvent(store, 'approval.request', { capabilityId: 'git_push' }, { id: 'evt-1' }),
      appendEvent(store, 'approval.request', { capabilityId: 'git_push' }, { id: 'evt-2' }),
      appendEvent(store, 'approval.request', { capabilityId: 'git_push' }, { id: 'evt-3' })
    ];

    const pattern = new MetaObservationCollector(store).collectPatterns()[0]!;
    expect(pattern.evidenceEventIds).toEqual(ids);
  });

  it('ignores events outside the requested time window', () => {
    const store = makeStore();
    const now = Date.UTC(2026, 3, 25, 12, 0, 0);
    const originalNow = Date.now;
    Date.now = () => now;

    try {
      appendEvent(store, 'approval.request', { capabilityId: 'shell_exec' }, { timestamp: now - 8 * 24 * 60 * 60 * 1000 });
      appendEvent(store, 'approval.request', { capabilityId: 'shell_exec' }, { timestamp: now - 1_000 });
      appendEvent(store, 'approval.request', { capabilityId: 'shell_exec' }, { timestamp: now - 500 });
      appendEvent(store, 'approval.request', { capabilityId: 'shell_exec' }, { timestamp: now });

      const patterns = new MetaObservationCollector(store).collectPatterns({
        windowMs: 7 * 24 * 60 * 60 * 1000,
        minOccurrences: 3
      });

      expect(patterns).toHaveLength(1);
      expect(patterns[0]?.occurrenceCount).toBe(3);
    } finally {
      Date.now = originalNow;
    }
  });

  it('ignores observation filter decisions without a blocked url', () => {
    const store = makeStore();
    appendEvent(store, 'observation_filter.decision', { url: 'https://example.com', shouldIngest: true });
    appendEvent(store, 'observation_filter.decision', { reason: 'output_too_short' });
    appendEvent(store, 'observation_filter.decision', { url: 'https://example.com', shouldIngest: false });

    expect(new MetaObservationCollector(store).collectPatterns()).toEqual([]);
  });
});
