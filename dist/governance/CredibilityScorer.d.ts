export declare const SOURCE_CREDIBILITY: Record<string, number>;
export declare class CredibilityScorer {
    score(sourceType: string): number;
    scoreForFact(fact: {
        sourceType?: string;
        evidenceCount?: number;
        recencyMs?: number;
    }): number;
}
//# sourceMappingURL=CredibilityScorer.d.ts.map