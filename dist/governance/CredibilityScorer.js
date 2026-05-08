const DAY_MS = 24 * 60 * 60 * 1000;
export const SOURCE_CREDIBILITY = {
    user_direct: 1.0,
    agent_finding: 0.8,
    web_fetch_official: 0.7,
    file_read: 0.6,
    web_fetch_general: 0.5,
    agent_observation: 0.4,
    shell_exec_output: 0.3
};
export class CredibilityScorer {
    score(sourceType) {
        return SOURCE_CREDIBILITY[sourceType] ?? 0.5;
    }
    scoreForFact(fact) {
        const baseCredibility = this.score(fact.sourceType || '');
        const evidenceCount = Math.max(0, fact.evidenceCount ?? 0);
        const evidenceMultiplier = Math.min(1 + evidenceCount * 0.05, 1.5);
        const recencyMs = Math.max(0, fact.recencyMs ?? Number.MAX_SAFE_INTEGER);
        const recencyFactor = recencyMs < DAY_MS
            ? 1.0
            : recencyMs < 7 * DAY_MS
                ? 0.95
                : recencyMs < 30 * DAY_MS
                    ? 0.85
                    : 0.7;
        return baseCredibility * evidenceMultiplier * recencyFactor;
    }
}
