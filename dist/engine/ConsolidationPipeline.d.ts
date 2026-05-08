import type { BeliefCandidate, BeliefRecord, Neuron } from '../types/index.js';
import { BeliefStore } from '../belief/BeliefStore.js';
import { BeliefExtractor } from './BeliefExtractor.js';
import { type MemoryGateResult } from './MemoryGate.js';
import { InteractionBinder, type BindingResult } from './InteractionBinder.js';
import type { InteractionUnitRecord } from '../store/InteractionUnitStore.js';
import { FactCompiler, type FactCompilationResult } from './FactCompiler.js';
import type { LocalSemanticCompiler, SemanticCompilation } from './LocalSemanticCompiler.js';
import type { CompilerConfidenceStore } from '../store/CompilerConfidenceStore.js';
import type { FactStore } from '../store/FactStore.js';
import type { EntityStore } from '../store/EntityStore.js';
import { OfflineConsolidationPipeline } from './OfflineConsolidationPipeline.js';
import { type AsyncEnrichmentHook } from '../types/AsyncEnrichment.js';
export interface ConsolidationResult {
    gate: MemoryGateResult;
    binding: BindingResult;
    interactionUnit?: InteractionUnitRecord | null;
    aaakSummary?: string;
    semanticCompilation?: SemanticCompilation;
    candidates: BeliefCandidate[];
    beliefs: BeliefRecord[];
    compiledFacts: FactCompilationResult['facts'];
    compiledEvents: FactCompilationResult['events'];
    compiledEntityIds: string[];
    rejectedCount: number;
}
/**
 * Online lightweight compilation pipeline.
 * Responsibilities stay intentionally narrow:
 * - raw episodes are already durably written before this stage runs
 * - apply the minimal gate and binder needed for the current session
 * - emit provisional facts / events / entity hints for near-term recall
 * - leave deep semantic reconciliation to the offline consolidation layer
 */
export declare class ConsolidationPipeline {
    private beliefStore;
    private interactionBinder;
    private factCompiler;
    private semanticCompiler;
    private factStore;
    private entityStore;
    private compilerConfidenceStore?;
    private beliefExtractor;
    private memoryGate;
    private asyncEnrichmentHook;
    private asyncEnrichmentEnabled;
    private lowConfidenceThreshold;
    private offlineConsolidationPipeline;
    constructor(beliefStore: BeliefStore, interactionBinder: InteractionBinder, factCompiler: FactCompiler, semanticCompiler: LocalSemanticCompiler, factStore: FactStore, entityStore: EntityStore, compilerConfidenceStore?: CompilerConfidenceStore | undefined, beliefExtractor?: BeliefExtractor, offlineConsolidationPipeline?: OfflineConsolidationPipeline, asyncEnrichmentHook?: AsyncEnrichmentHook, options?: {
        enabled?: boolean;
        lowConfidenceThreshold?: number;
    });
    consolidate(neuron: Neuron, sourceEventId: string): ConsolidationResult;
    private ensureAAAKSummary;
    private extractBeliefCandidates;
    private calculateImportance;
    private dispatchAsyncEnrichment;
    private scheduleOfflineConsolidation;
    private collectAsyncEnrichmentTriggers;
    private buildAsyncEnrichmentEntityBinding;
    private buildAsyncEnrichmentContext;
    private hasSelfCorrectionPattern;
    private hasSuspiciousUnseenEntityBinding;
    private persistAsyncEnrichmentResult;
}
//# sourceMappingURL=ConsolidationPipeline.d.ts.map