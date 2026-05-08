export class ContradictionResolver {
    scorer;
    defaultStrategy;
    constructor(scorer, defaultStrategy = 'credibility_wins') {
        this.scorer = scorer;
        this.defaultStrategy = defaultStrategy;
        assertContradictionStrategy(defaultStrategy);
    }
    resolve(params) {
        const strategy = params.strategy ?? this.defaultStrategy;
        assertContradictionStrategy(strategy);
        if (params.newFact.predicateValue === params.existingFact.predicateValue) {
            return 'contradiction_pending';
        }
        if (strategy === 'recency_wins') {
            if (params.newFact.createdAt > params.existingFact.createdAt)
                return 'new_wins';
            if (params.existingFact.createdAt > params.newFact.createdAt)
                return 'old_wins';
            return 'contradiction_pending';
        }
        if (strategy === 'evidence_wins') {
            const newEvidence = params.newFact.evidenceCount ?? 0;
            const oldEvidence = params.existingFact.evidenceCount ?? 0;
            if (newEvidence > oldEvidence)
                return 'new_wins';
            if (oldEvidence > newEvidence)
                return 'old_wins';
            return 'contradiction_pending';
        }
        const now = Date.now();
        const newScore = this.scorer.scoreForFact({
            sourceType: params.newFact.sourceType,
            evidenceCount: params.newFact.evidenceCount,
            recencyMs: Math.max(0, now - params.newFact.createdAt)
        });
        const oldScore = this.scorer.scoreForFact({
            sourceType: params.existingFact.sourceType,
            evidenceCount: params.existingFact.evidenceCount,
            recencyMs: Math.max(0, now - params.existingFact.createdAt)
        });
        if (newScore > oldScore + 0.05)
            return 'new_wins';
        if (oldScore > newScore + 0.05)
            return 'old_wins';
        return 'contradiction_pending';
    }
}
export function assertContradictionStrategy(value) {
    if (value === 'credibility_wins' || value === 'recency_wins' || value === 'evidence_wins') {
        return;
    }
    throw new Error(`Invalid contradictionStrategy: ${String(value)}. Expected credibility_wins, recency_wins, or evidence_wins.`);
}
