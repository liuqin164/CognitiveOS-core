import type { QueryManagerLike } from '../types/ExtensionPoints.js';
import type { Board, BoardEvent, BoardSnapshot, BoardSnapshotOptions } from './Board.js';
import { BoardEventBus } from './BoardEventBus.js';

export class ContextBoard implements Board {
  readonly id = 'context';
  readonly description = 'Aggregated read-only view of context summary and recent traces';
  readonly eventBus: BoardEventBus;

  constructor(
    private readonly contextManager: QueryManagerLike,
    private readonly traceManager: QueryManagerLike,
    private readonly taskId: string,
    eventBus?: BoardEventBus
  ) {
    this.eventBus = eventBus ?? new BoardEventBus();
  }

  async snapshot(_options?: BoardSnapshotOptions): Promise<BoardSnapshot> {
    const contextSummary = await this.contextManager.query({ type: 'current_pack', taskId: this.taskId });
    const recentTraces = await this.traceManager.query({ type: 'recent', limit: 5 }) as unknown[];

    return {
      boardId: this.id,
      capturedAt: Date.now(),
      data: {
        contextSummary,
        recentTraces,
        summary: {
          traceCount: recentTraces.length
        }
      }
    };
  }

  stream(callback: (event: BoardEvent) => void): () => void {
    return this.eventBus.subscribe({ boardId: this.id }, callback);
  }
}
