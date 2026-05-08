import { CredibilityScorer } from './CredibilityScorer.js';
export type ContradictionVerdict = 'new_wins' | 'old_wins' | 'contradiction_pending';
export type ContradictionStrategy = 'credibility_wins' | 'recency_wins' | 'evidence_wins';
type FactLike = {
    sourceType?: string;
    evidenceCount?: number;
    createdAt: number;
    predicateValue: string;
};
export declare class ContradictionResolver {
    private scorer;
    private readonly defaultStrategy;
    constructor(scorer: CredibilityScorer, defaultStrategy?: ContradictionStrategy);
    resolve(params: {
        newFact: FactLike;
        existingFact: FactLike;
        strategy?: ContradictionStrategy;
    }): ContradictionVerdict;
}
export declare function assertContradictionStrategy(value: unknown): asserts value is ContradictionStrategy;
export {};
//# sourceMappingURL=ContradictionResolver.d.ts.map