import type { TraceEvent } from './TraceEvent.js';
import { TraceStore } from './TraceStore.js';

export class TraceQuery {
  constructor(private store: TraceStore) {}

  forTask(taskId: string): TraceEvent[] {
    return this.store.queryByTaskId(taskId);
  }

  forProject(projectId: string, limit?: number): TraceEvent[] {
    const events = this.store.queryByProjectId(projectId);
    return typeof limit === 'number' ? events.slice(0, Math.max(limit, 0)) : events;
  }

  decisionChain(rootEventId: string): TraceEvent[] {
    return this.store.getDecisionChain(rootEventId);
  }

  summary(taskId: string): { eventCount: number; eventTypes: string[]; durationMs: number } {
    const events = this.forTask(taskId);
    const eventTypes = Array.from(new Set(events.map((event) => event.eventType)));
    const durationMs = events.length > 1
      ? Math.max(0, events[events.length - 1]!.timestamp - events[0]!.timestamp)
      : 0;

    return {
      eventCount: events.length,
      eventTypes,
      durationMs
    };
  }
}
