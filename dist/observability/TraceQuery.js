export class TraceQuery {
    store;
    constructor(store) {
        this.store = store;
    }
    forTask(taskId) {
        return this.store.queryByTaskId(taskId);
    }
    forProject(projectId, limit) {
        const events = this.store.queryByProjectId(projectId);
        return typeof limit === 'number' ? events.slice(0, Math.max(limit, 0)) : events;
    }
    decisionChain(rootEventId) {
        return this.store.getDecisionChain(rootEventId);
    }
    summary(taskId) {
        const events = this.forTask(taskId);
        const eventTypes = Array.from(new Set(events.map((event) => event.eventType)));
        const durationMs = events.length > 1
            ? Math.max(0, events[events.length - 1].timestamp - events[0].timestamp)
            : 0;
        return {
            eventCount: events.length,
            eventTypes,
            durationMs
        };
    }
}
