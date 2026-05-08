export function summarizeAlgorithmReviewMetrics(snapshot) {
    const reviewedFacts = snapshot.facts.filter((fact) => Boolean(fact.metadata?.algorithm_review_kind));
    const verifiedCount = reviewedFacts.filter((fact) => fact.status === 'verified').length;
    const provisionalCount = reviewedFacts.filter((fact) => fact.status === 'provisional' || fact.status === 'provisional_enriched' || fact.status === 'enriched_candidate').length;
    const baselineIssues = new Set((snapshot.baselineFacts || [])
        .filter((fact) => fact.predicateFamily === 'has_issue')
        .map((fact) => `${fact.neuronId}|${fact.predicateValue}|${fact.object || ''}`));
    const currentIssues = new Set(snapshot.facts
        .filter((fact) => fact.predicateFamily === 'has_issue')
        .map((fact) => `${fact.neuronId}|${fact.predicateValue}|${fact.object || ''}`));
    return {
        backendMode: snapshot.backendMode,
        reviewVersion: snapshot.reviewVersion,
        provisionalToVerifiedPromotionCount: verifiedCount,
        provisionalToVerifiedPromotionRate: reviewedFacts.length > 0 ? verifiedCount / reviewedFacts.length : 0,
        keepProvisionalCount: provisionalCount,
        keepProvisionalRate: reviewedFacts.length > 0 ? provisionalCount / reviewedFacts.length : 0,
        supersedeCount: reviewedFacts.filter((fact) => fact.status === 'superseded').length,
        rejectArchiveCount: reviewedFacts.filter((fact) => fact.status === 'rejected' || fact.status === 'archived').length,
        selfCorrectionRepairHitCount: reviewedFacts.filter((fact) => `${fact.metadata?.algorithm_review_kind || ''}`.includes('self_correction')).length,
        multiFactRepairCompletenessDelta: [...currentIssues].filter((key) => !baselineIssues.has(key)).length,
        aliasMergeSuggestionPrecisionProxy: null,
        backendOutcomeDifferenceCount: snapshot.facts.length - (snapshot.baselineFacts?.length || 0)
    };
}
