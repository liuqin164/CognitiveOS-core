import { randomUUID } from 'crypto';
import type { TraceEvent } from './TraceEvent.js';
import { TraceStore } from './TraceStore.js';

export class TraceWriter {
  constructor(private store: TraceStore) {}

  emit(event: Omit<TraceEvent, 'id' | 'timestamp'>): void {
    this.store.append({
      ...event,
      id: randomUUID(),
      timestamp: Date.now()
    });
  }
}
