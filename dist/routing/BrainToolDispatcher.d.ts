/**
 * BrainToolDispatcher.ts
 * Routes BrainToolCall to the correct tool implementation.
 * Phase 48 — v1.1
 */
import type { FactStore } from '../store/FactStore.js';
import type { EntityStore } from '../store/EntityStore.js';
import type { BeliefStore } from '../belief/BeliefStore.js';
import type { MemoryGraph } from '../core/MemoryGraph.js';
import type { GraphEdgeStoreLike } from '../types/ExtensionPoints.js';
import type { FileAssetStore, FileChunkStore } from '../assets/index.js';
import type { ISkillDiscovery } from '../types/ExtensionPoints.js';
import type { BrainToolCall, BrainToolResult } from './LLMToolSchema.js';
import type { RecallFunction } from './ExecutionLoop.js';
import type { BrainToolDispatcherLike, BrainToolDispatchContext } from './IterativeLLMClarifier.js';
export interface BrainToolDispatcherDeps {
    recallFn: RecallFunction;
    memoryGraph: MemoryGraph;
    factStore: FactStore;
    entityStore: EntityStore;
    beliefStore: BeliefStore;
    graphEdgeStore?: GraphEdgeStoreLike;
    fileAssetStore?: FileAssetStore;
    fileChunkStore?: FileChunkStore;
    skillDiscoveryEngine?: ISkillDiscovery;
}
export declare class BrainToolDispatcher implements BrainToolDispatcherLike {
    private readonly deps;
    private readonly secondaryRecall;
    private readonly neuronContext;
    private readonly entityExpand;
    private readonly skillDiscovery?;
    constructor(deps: BrainToolDispatcherDeps);
    dispatch(call: BrainToolCall, context?: BrainToolDispatchContext): Promise<BrainToolResult>;
    private error;
}
//# sourceMappingURL=BrainToolDispatcher.d.ts.map