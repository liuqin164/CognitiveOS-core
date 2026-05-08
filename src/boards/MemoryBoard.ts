import type { QueryManagerLike } from '../types/ExtensionPoints.js';
import type { Board, BoardEvent, BoardSnapshot, BoardSnapshotOptions } from './Board.js';
import { BoardEventBus } from './BoardEventBus.js';

export class MemoryBoard implements Board {
  readonly id = 'memory';
  readonly description = 'Aggregated read-only view of recent memory facts';
  readonly eventBus: BoardEventBus;

  constructor(
    private readonly memoryManager: QueryManagerLike,
    eventBus?: BoardEventBus
  ) {
    this.eventBus = eventBus ?? new BoardEventBus();
  }

  async snapshot(options?: BoardSnapshotOptions): Promise<BoardSnapshot> {
    const recentFacts = await this.memoryManager.query({
      type: 'recent_facts',
      limit: options?.limit ?? 10
    }) as unknown[];

    return {
      boardId: this.id,
      capturedAt: Date.now(),
      data: {
        recentFacts,
        summary: {
          factCount: recentFacts.length
        }
      }
    };
  }

  stream(callback: (event: BoardEvent) => void): () => void {
    return this.eventBus.subscribe({ boardId: this.id }, callback);
  }
}
