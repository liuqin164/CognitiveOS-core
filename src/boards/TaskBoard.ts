import type { QueryManagerLike } from '../types/ExtensionPoints.js';
import type { Board, BoardEvent, BoardSnapshot, BoardSnapshotOptions } from './Board.js';
import { BoardEventBus } from './BoardEventBus.js';

export class TaskBoard implements Board {
  readonly id = 'task';
  readonly description = 'Aggregated read-only view of tasks and pending approvals';
  readonly eventBus: BoardEventBus;

  constructor(
    private readonly taskManager: QueryManagerLike,
    private readonly approvalManager: QueryManagerLike,
    eventBus?: BoardEventBus
  ) {
    this.eventBus = eventBus ?? new BoardEventBus();
  }

  async snapshot(_options?: BoardSnapshotOptions): Promise<BoardSnapshot> {
    const tasks = await this.taskManager.query({ type: 'list' }) as Array<{ status?: string }>;
    const pendingApprovals = await this.approvalManager.query({ type: 'list_pending' }) as unknown[];
    const byStatus = tasks.reduce<Record<string, number>>((acc, task) => {
      const status = task.status ?? 'unknown';
      acc[status] = (acc[status] ?? 0) + 1;
      return acc;
    }, {});

    return {
      boardId: this.id,
      capturedAt: Date.now(),
      data: {
        tasks,
        pendingApprovals,
        summary: {
          total: tasks.length,
          byStatus
        }
      }
    };
  }

  stream(callback: (event: BoardEvent) => void): () => void {
    return this.eventBus.subscribe({ boardId: this.id }, callback);
  }
}
