export interface EvidenceSourceScore {
    neuronId: string;
    score: number;
    source: string;
    reason: string;
}
export declare class EvidenceFusionRanker {
    rank(inputs: EvidenceSourceScore[], limit?: number): {
        neuronIds: string[];
        reasonsByNeuronId: Map<string, string[]>;
    };
}
//# sourceMappingURL=EvidenceFusionRanker.d.ts.map