import { BoardEventBus } from './BoardEventBus.js';
export class ApprovalBoard {
    approvalManager;
    taskManager;
    id = 'approval';
    description = 'Aggregated read-only view of pending approvals and tasks';
    eventBus;
    constructor(approvalManager, taskManager, eventBus) {
        this.approvalManager = approvalManager;
        this.taskManager = taskManager;
        this.eventBus = eventBus ?? new BoardEventBus();
    }
    async snapshot(_options) {
        const pendingApprovals = await this.approvalManager.query({ type: 'list_pending' });
        const tasks = await this.taskManager.query({ type: 'list' });
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
    stream(callback) {
        return this.eventBus.subscribe({ boardId: this.id }, callback);
    }
}
