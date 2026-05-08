import type { QueryManagerLike } from '../types/ExtensionPoints.js';
import type { Board, BoardEvent, BoardSnapshot, BoardSnapshotOptions } from './Board.js';
import { BoardEventBus } from './BoardEventBus.js';

export class ApprovalBoard implements Board {
  readonly id = 'approval';
  readonly description = 'Aggregated read-only view of pending approvals and tasks';
  readonly eventBus: BoardEventBus;

  constructor(
    private readonly approvalManager: QueryManagerLike,
    private readonly taskManager: QueryManagerLike,
    eventBus?: BoardEventBus
  ) {
    this.eventBus = eventBus ?? new BoardEventBus();
  }

  async snapshot(_options?: BoardSnapshotOptions): Promise<BoardSnapshot> {
    const pendingApprovals = await this.approvalManager.query({ type: 'list_pending' }) as unknown[];
    const tasks = await this.taskManager.query({ type: 'list' }) as unknown[];

    return {
      boardId: this.id,
      capturedAt: Date.now(),
      data: {
        pendingApprovals,
        tasks,
        summary: {
          pendingCount: pendingApprovals.length,
          taskCount: tasks.length
        }
      }
    };
  }

  stream(callback: (event: BoardEvent) => void): () => void {
    return this.eventBus.subscribe({ boardId: this.id }, callback);
  }
}
