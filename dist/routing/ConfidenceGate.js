export class ConfidenceGate {
    threshold;
    constructor(options = {}) {
        this.threshold = options.threshold ?? 0.75;
    }
    evaluate(recallResult, options = {}) {
        const facts = recallResult.compiledMemory.facts;
        const normalizedEntityHint = options.entityHint?.trim().toLowerCase();
        const signals = {
            hasCompiledFacts: facts.length > 0,
            highConfidenceFact: facts.some((fact) => fact.confidence >= 0.85),
            exactEntityMatch: normalizedEntityHint
                ? facts.some((fact) => this.matchesEntityHint(fact.subject, fact.object, normalizedEntityHint))
                : false,
            graphEdgeTraversed: recallResult.strategy.primaryLevel === 'compiled_memory' &&
                facts.length > 0 &&
                recallResult.rawEvidence.length > facts.length,
            timeRangeClear: facts.some((fact) => typeof fact.validFrom === 'number' && fact.validFrom > 0),
            multipleCorroborating: facts.length >= 2
        };
        const score = Math.min(1, (signals.hasCompiledFacts ? 0.3 : 0) +
            (signals.highConfidenceFact ? 0.2 : 0) +
            (signals.exactEntityMatch ? 0.2 : 0) +
            (signals.graphEdgeTraversed ? 0.15 : 0) +
            (signals.timeRangeClear ? 0.1 : 0) +
            (signals.multipleCorroborating ? 0.05 : 0));
        const triggeredSignals = Object.entries(signals)
            .filter(([, active]) => active)
            .map(([name]) => name);
        return {
            score,
            verdict: score >= this.threshold ? 'cpu_sufficient' : 'needs_llm',
            reason: triggeredSignals.length > 0 ? triggeredSignals.join(', ') : 'none',
            signals
        };
    }
    matchesEntityHint(subject, object, entityHint) {
        return subject.toLowerCase().includes(entityHint) || object?.toLowerCase().includes(entityHint) === true;
    }
}
