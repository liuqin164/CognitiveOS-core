import { BoardEventBus } from './BoardEventBus.js';
export class ProcessBoard {
    capabilityManager;
    traceManager;
    getRuntimeSelfManifest;
    id = 'process';
    description = 'Aggregated read-only view of capabilities and recent traces';
    eventBus;
    constructor(capabilityManager, traceManager, eventBus, getRuntimeSelfManifest) {
        this.capabilityManager = capabilityManager;
        this.traceManager = traceManager;
        this.getRuntimeSelfManifest = getRuntimeSelfManifest;
        this.eventBus = eventBus ?? new BoardEventBus();
    }
    async snapshot(options) {
        const capabilities = await this.capabilityManager.query({ type: 'list' });
        const recentTraces = await this.traceManager.query({
            type: 'recent',
            limit: options?.limit ?? 10
        });
        const data = {
            capabilities,
            recentTraces,
            summary: {
                capabilityCount: capabilities.length,
                traceCount: recentTraces.length,
                runtimeSelfManifestId: this.getRuntimeSelfManifest?.()?.manifestId
            }
        };
        const runtimeSelf = this.summarizeRuntimeSelf();
        if (runtimeSelf) {
            data.runtimeSelf = runtimeSelf;
        }
        return {
            boardId: this.id,
            capturedAt: Date.now(),
            data
        };
    }
    stream(callback) {
        return this.eventBus.subscribe({ boardId: this.id }, callback);
    }
    summarizeRuntimeSelf() {
        const manifest = this.getRuntimeSelfManifest?.();
        if (!manifest)
            return null;
        return {
            manifestId: manifest.manifestId,
            generatedAt: manifest.generatedAt,
            capabilityCount: manifest.capabilities.length,
            modelCount: manifest.models.roles.length,
            fileAssetCount: manifest.fileAssets.indexedAssetCount,
            constraints: manifest.constraints.map((constraint) => constraint.id)
        };
    }
}
