import type { QueryManagerLike, RuntimeSelfManifestLike } from '../types/ExtensionPoints.js';
import type { Board, BoardEvent, BoardSnapshot, BoardSnapshotOptions } from './Board.js';
import { BoardEventBus } from './BoardEventBus.js';

export class ProcessBoard implements Board {
  readonly id = 'process';
  readonly description = 'Aggregated read-only view of capabilities and recent traces';
  readonly eventBus: BoardEventBus;

  constructor(
    private readonly capabilityManager: QueryManagerLike,
    private readonly traceManager: QueryManagerLike,
    eventBus?: BoardEventBus,
    private readonly getRuntimeSelfManifest?: () => RuntimeSelfManifestLike | null
  ) {
    this.eventBus = eventBus ?? new BoardEventBus();
  }

  async snapshot(options?: BoardSnapshotOptions): Promise<BoardSnapshot> {
    const capabilities = await this.capabilityManager.query({ type: 'list' }) as unknown[];
    const recentTraces = await this.traceManager.query({
      type: 'recent',
      limit: options?.limit ?? 10
    }) as unknown[];

    const data: Record<string, unknown> = {
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

  stream(callback: (event: BoardEvent) => void): () => void {
    return this.eventBus.subscribe({ boardId: this.id }, callback);
  }

  private summarizeRuntimeSelf(): Record<string, unknown> | null {
    const manifest = this.getRuntimeSelfManifest?.();
    if (!manifest) return null;
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
