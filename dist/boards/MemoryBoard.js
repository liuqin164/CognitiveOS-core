import { BoardEventBus } from './BoardEventBus.js';
export class MemoryBoard {
    memoryManager;
    id = 'memory';
    description = 'Aggregated read-only view of recent memory facts';
    eventBus;
    constructor(memoryManager, eventBus) {
        this.memoryManager = memoryManager;
        this.eventBus = eventBus ?? new BoardEventBus();
    }
    async snapshot(options) {
        const recentFacts = await this.memoryManager.query({
            type: 'recent_facts',
            limit: options?.limit ?? 10
        });
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
    stream(callback) {
        return this.eventBus.subscribe({ boardId: this.id }, callback);
    }
}
