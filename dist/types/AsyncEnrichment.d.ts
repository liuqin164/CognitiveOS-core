import type { BeliefCandidate, Neuron } from './index.js';
import type { ConsolidationResult } from '../engine/ConsolidationPipeline.js';
import type { EntityRecord } from '../store/EntityStore.js';
import type { FactRecord } from '../store/FactStore.js';
export interface AsyncEnrichmentTrigger {
    kind: 'ingest_compiled_fact_count_zero' | 'self_correction_pattern' | 'multi_candidate_single_fact' | 'unseen_entity_binding_suspect' | 'low_compiler_confidence';
    detail: string;
}
export interface AsyncEnrichmentCompilerOutput {
    facts: ConsolidationResult['compiledFacts'];
    events: ConsolidationResult['compiledEvents'];
    entityIds: string[];
}
export interface AsyncEnrichmentEntityBinding {
    compiledEntityIds: string[];
    compiledEntities: EntityRecord[];
    suspicious: boolean;
    reasons: string[];
}
export interface AsyncEnrichmentContextSnapshot {
    recentEntities: EntityRecord[];
    recentFacts: FactRecord[];
    recentPreferenceFacts: FactRecord[];
}
export interface AsyncEnrichmentWriteback {
    entities?: Array<{
        canonicalName: string;
        type: string;
        aliases?: string[];
        metadata?: Record<string, unknown>;
        instanceMode?: 'auto' | 'canonical' | 'new_instance';
    }>;
    facts?: Array<Omit<FactRecord, 'factId'> & {
        metadata?: Record<string, unknown>;
    }>;
    beliefs?: BeliefCandidate[];
}
export interface AsyncEnrichmentHookInput {
    runId: string;
    neuron: Neuron;
    sourceEventId: string;
    triggers: AsyncEnrichmentTrigger[];
    consolidation: ConsolidationResult;
    compilerOutput: AsyncEnrichmentCompilerOutput;
    entityBinding: AsyncEnrichmentEntityBinding;
    recentContext: AsyncEnrichmentContextSnapshot;
}
export interface AsyncEnrichmentWritebackContext {
    persist(result: AsyncEnrichmentWriteback): {
        entities: EntityRecord[];
        facts: FactRecord[];
        beliefIds: string[];
    };
}
export interface AsyncEnrichmentHook {
    enrich(input: AsyncEnrichmentHookInput, context: AsyncEnrichmentWritebackContext): Promise<AsyncEnrichmentWriteback | void> | AsyncEnrichmentWriteback | void;
}
export declare class NoopAsyncEnrichmentHook implements AsyncEnrichmentHook {
    enrich(): void;
}
export declare function createAsyncEnrichmentRunId(): string;
//# sourceMappingURL=AsyncEnrichment.d.ts.map