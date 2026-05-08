import { logger } from '../utils/Logger.js';
/**
 * 基于 memory_events 的最小向量投影器。
 * 目标：
 * - 启动时优先 replay 增量事件
 * - 只有在 checkpoint 不可信时才 full rebuild
 */
export class VectorProjector {
    eventStore;
    memoryGraph;
    vectorStore;
    projectionName;
    constructor(eventStore, memoryGraph, vectorStore, projectionName = 'hnsw_main') {
        this.eventStore = eventStore;
        this.memoryGraph = memoryGraph;
        this.vectorStore = vectorStore;
        this.projectionName = projectionName;
    }
    async bootstrap() {
        const checkpoint = this.eventStore.getProjectionCheckpoint(this.projectionName);
        const pendingEvents = this.eventStore.getEventsAfter(checkpoint?.lastEventTime);
        if (!checkpoint) {
            await this.fullRebuild('initial_build');
            return;
        }
        if (checkpoint.status !== 'ready') {
            await this.fullRebuild(`checkpoint_${checkpoint.status}`);
            return;
        }
        if (pendingEvents.length === 0) {
            logger.info(`Vector projection ready: count=${checkpoint.lastFullCount}`);
            return;
        }
        try {
            await this.replay(pendingEvents, checkpoint.lastRebuildAt);
        }
        catch (error) {
            logger.warn('Vector replay failed, falling back to full rebuild', error);
            await this.fullRebuild('replay_failed');
        }
    }
    async fullRebuild(reason) {
        logger.warn(`Rebuilding vector projection from SQLite: reason=${reason}`);
        this.eventStore.upsertProjectionCheckpoint({
            projectionName: this.projectionName,
            status: 'building',
            lastFullCount: 0,
            metadata: { reason }
        });
        this.vectorStore.clear();
        const pageSize = 2000;
        let total = 0;
        let pageNo = 0;
        await this.memoryGraph.forEachNeuronVectorPage(pageSize, async (rows) => {
            pageNo += 1;
            for (const row of rows) {
                if (row.vector.length === 0)
                    continue;
                this.vectorStore.addVector(row.id, row.vector);
                total += 1;
            }
            if (pageNo % 10 === 0) {
                logger.info(`Vector rebuild progress: pages=${pageNo}, indexed=${total}`);
            }
            await Promise.resolve();
        }, { includeStatuses: ['active', 'cold'], onlyNotDeleted: true });
        const latestEvent = this.eventStore.getLatestEvent();
        this.eventStore.upsertProjectionCheckpoint({
            projectionName: this.projectionName,
            lastEventId: latestEvent?.eventId,
            lastEventTime: latestEvent?.occurredAt,
            lastRebuildAt: Date.now(),
            lastFullCount: this.vectorStore.getCurrentCount(),
            status: 'ready',
            metadata: {
                reason,
                mode: 'full_rebuild'
            }
        });
    }
    async replay(events, previousRebuildAt) {
        if (events.length === 0)
            return;
        logger.info(`Replaying vector projection events: count=${events.length}`);
        for (const event of events) {
            this.applyEvent(event);
            await Promise.resolve();
        }
        const lastEvent = events[events.length - 1];
        this.eventStore.upsertProjectionCheckpoint({
            projectionName: this.projectionName,
            lastEventId: lastEvent?.eventId,
            lastEventTime: lastEvent?.occurredAt,
            lastRebuildAt: previousRebuildAt,
            lastFullCount: this.vectorStore.getCurrentCount(),
            status: 'ready',
            metadata: {
                mode: 'incremental_replay',
                replayedEventCount: events.length
            }
        });
    }
    applyEvent(event) {
        switch (event.eventType) {
            case 'INGESTED':
            case 'RESTORED': {
                const neuron = this.memoryGraph.getNeuron(event.streamId);
                if (!neuron)
                    return;
                if (neuron.metadata.status === 'archived')
                    return;
                if (!neuron.coordinates.V || neuron.coordinates.V.length === 0)
                    return;
                this.vectorStore.addVector(neuron.id, neuron.coordinates.V);
                return;
            }
            case 'ARCHIVED': {
                this.vectorStore.removePoint(event.streamId);
                return;
            }
            default:
                return;
        }
    }
}
