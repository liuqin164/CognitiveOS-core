import type { Neuron, QueryResult } from '../types/index.js';
import type { QueryIR } from '../types/query-ir.js';
import type { IVectorStore } from '../store/IVectorStore.js';
export declare class TwoStagePulseRanker {
    private vectorStore;
    private topK;
    constructor(vectorStore: IVectorStore, topK?: number);
    query(queryVector: number[], getNeuron: (id: string) => Neuron | null, ir: QueryIR): Promise<QueryResult>;
    private convertTemporalConstraint;
    private convertSpatialConstraint;
    private resolveRelativeTime;
    private applyHardConstraints;
    setTopK(k: number): void;
    getTopK(): number;
}
//# sourceMappingURL=TwoStagePulseRanker.d.ts.map