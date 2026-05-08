import type { QueryIR } from '../types/query-ir.js';
export type RetrievalIntent = 'fact_lookup' | 'preference_lookup' | 'decision_lookup' | 'trace' | 'constraint_lookup' | 'debug_context' | 'recall';
export interface RetrievalExecutionPlan {
    intent: RetrievalIntent;
    routeOrder: Array<'beliefs' | 'vector' | 'fts' | 'graph'>;
    topK: {
        beliefs: number;
        vector: number;
        fts: number;
        graph: number;
    };
    weights: {
        beliefs: number;
        vector: number;
        fts: number;
        graph: number;
    };
    aggregation: {
        strategy: 'belief_first' | 'weighted_fusion' | 'graph_expansion' | 'fts_backfill';
        suppressSupersededBeliefs: boolean;
        suppressArchivedNeurons: boolean;
    };
    filters: {
        projectId?: string;
        filePath?: string;
        fileType?: string;
        temporal: QueryIR['temporal'];
        mustMatch: string[];
        shouldMatch: string[];
        semantics: QueryIR['semantics'];
    };
    diagnostics: {
        plannerVersion: 'v0.3';
        reasons: string[];
    };
}
export declare class RetrievalPlanner {
    plan(ir: QueryIR): RetrievalExecutionPlan;
    private inferIntent;
    private normalizeWeights;
}
//# sourceMappingURL=RetrievalPlanner.d.ts.map