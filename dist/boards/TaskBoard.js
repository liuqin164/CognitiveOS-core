import { BoardEventBus } from './BoardEventBus.js';
export class TaskBoard {
    taskManager;
    approvalManager;
    id = 'task';
    description = 'Aggregated read-only view of tasks and pending approvals';
    eventBus;
    constructor(taskManager, approvalManager, eventBus) {
        this.taskManager = taskManager;
        this.approvalManager = approvalManager;
        this.eventBus = eventBus ?? new BoardEventBus();
    }
    async snapshot(_options) {
        const tasks = await this.taskManager.query({ type: 'list' });
        const pendingApprovals = await this.approvalManager.query({ type: 'list_pending' });
        const byStatus = tasks.reduce((acc, task) => {
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
    stream(callback) {
        return this.eventBus.subscribe({ boardId: this.id }, callback);
    }
}
