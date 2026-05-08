import type { Neuron } from '../types/index.js';
import type { EntityStore } from '../store/EntityStore.js';
import type { FactRecord, FactStore, EventRecord } from '../store/FactStore.js';
import type { InteractionUnitRecord } from '../store/InteractionUnitStore.js';
import type { SemanticCompilation } from './LocalSemanticCompiler.js';
export interface FactCompilationResult {
    facts: FactRecord[];
    events: EventRecord[];
    entityIds: string[];
}
export declare class FactCompiler {
    private factStore;
    private entityStore;
    constructor(factStore: FactStore, entityStore: EntityStore);
    compile(input: {
        neuron: Neuron;
        unit?: InteractionUnitRecord | null;
        semanticCompilation?: SemanticCompilation;
    }): FactCompilationResult;
    private normalizeName;
    private extractIssueMatches;
    private normalizeIssueValue;
    private buildIssueMetadata;
    private buildContinuityMetadata;
    private buildWriteTimeBindingMetadata;
    private resolveContinuityProjectSurfaceName;
    private extractIssuePhrase;
    private inferIssueFamily;
    private buildSelfCorrectionArtifact;
    private isSelfCorrectionSurface;
    private extractCorrectionSide;
    private extractNegatedCorrectionSide;
    private factMatchesCorrectionSide;
    private extractPendingEntityReference;
    private isRelativeProjectSurface;
    private resolveImplicitEntity;
    private resolveRelativeEntitySafely;
    private isWeakRelativeReferenceSurface;
    private pickSpecificRelativeReference;
}
//# sourceMappingURL=FactCompiler.d.ts.map