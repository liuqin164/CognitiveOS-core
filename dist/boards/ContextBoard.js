import { BoardEventBus } from './BoardEventBus.js';
export class ContextBoard {
    contextManager;
    traceManager;
    taskId;
    id = 'context';
    description = 'Aggregated read-only view of context summary and recent traces';
    eventBus;
    constructor(contextManager, traceManager, taskId, eventBus) {
        this.contextManager = contextManager;
        this.traceManager = traceManager;
        this.taskId = taskId;
        this.eventBus = eventBus ?? new BoardEventBus();
    }
    async snapshot(_options) {
        const contextSummary = await this.contextManager.query({ type: 'current_pack', taskId: this.taskId });
        const recentTraces = await this.traceManager.query({ type: 'recent', limit: 5 });
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
    stream(callback) {
        return this.eventBus.subscribe({ boardId: this.id }, callback);
    }
}
