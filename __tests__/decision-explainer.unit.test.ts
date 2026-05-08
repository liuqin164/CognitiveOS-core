import { describe, expect, it } from 'bun:test';
import type { TraceEvent } from '../src/observability/TraceEvent.js';
import { DecisionExplainer } from '../src/observability/DecisionExplainer.js';

function makeEvent(overrides: Partial<TraceEvent> = {}): TraceEvent {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    timestamp: overrides.timestamp ?? new Date('2026-04-25T10:20:30Z').getTime(),
    taskId: overrides.taskId ?? 'task-1',
    projectId: overrides.projectId,
    eventType: overrides.eventType ?? 'recall.request',
    payload: overrides.payload ?? { query: 'find issue' },
    parentEventId: overrides.parentEventId
  };
}

describe('DecisionExplainer', () => {
  it('returns No events for an empty array', () => {
    expect(new DecisionExplainer().explain([])).toBe('No events');
  });

  it('formats a single event with timestamp and event type', () => {
    const output = new DecisionExplainer().explain([
      makeEvent({
        eventType: 'recall.request',
        payload: { query: 'router issue' }
      })
    ]);

    expect(output).toContain('Task task-1');
    expect(output).toContain('[10:20:30] recall.request');
    expect(output).toContain('query="router issue"');
  });

  it('sorts multiple events by timestamp before rendering', () => {
    const output = new DecisionExplainer().explain([
      makeEvent({ id: 'later', timestamp: 20_000, eventType: 'recall.result', payload: { factCount: 2 } }),
      makeEvent({ id: 'earlier', timestamp: 10_000, eventType: 'task_router.plan', payload: { intentType: 'factual_recall', stepCount: 2 } })
    ]);

    expect(output.indexOf('task_router.plan')).toBeLessThan(output.indexOf('recall.result'));
  });

  it('uses └─ for the last event and ├─ for earlier events', () => {
    const output = new DecisionExplainer().explain([
      makeEvent({ id: 'first', timestamp: 1 }),
      makeEvent({ id: 'second', timestamp: 2, eventType: 'recall.result', payload: { factCount: 1 } })
    ]);

    expect(output).toContain('  ├─');
    expect(output).toContain('  └─');
  });

  it('renders task_state.transition with from/to states', () => {
    const output = new DecisionExplainer().explain([
      makeEvent({
        eventType: 'task_state.transition',
        payload: { from: 'running', to: 'completed' }
      })
    ]);

    expect(output).toContain('task_state.transition  running → completed');
  });

  it('compacts gate decision labels in the output', () => {
    const output = new DecisionExplainer().explain([
      makeEvent({
        eventType: 'confidence_gate.decision',
        payload: { verdict: 'cpu_resolved', score: 0.82 }
      })
    ]);

    expect(output).toContain('confidence_gate  verdict=cpu_resolved, score=0.82');
  });
});
