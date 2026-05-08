export class UserModelManager {
    userModelStore;
    extractor;
    reporter;
    latestDeltaByProject = new Map();
    constructor(userModelStore, extractor, reporter) {
        this.userModelStore = userModelStore;
        this.extractor = extractor;
        this.reporter = reporter;
    }
    async refresh(projectId) {
        const previousSnapshot = this.reporter
            ? this.userModelStore.query(projectId, { minConfidence: 0, limit: Number.MAX_SAFE_INTEGER })
            : [];
        await this.extractor.extract(projectId);
        if (this.reporter)
            this.latestDeltaByProject.set(projectId, this.reporter.computeDelta(projectId, previousSnapshot));
    }
    getUserContext(projectId, topK = 5) {
        const insights = this.userModelStore.query(projectId, { minConfidence: 0.3, limit: topK });
        const delta = this.latestDeltaByProject.get(projectId);
        return {
            projectId,
            insights,
            delta,
            toPromptFragment: () => formatPromptFragment(projectId, insights, this.reporter?.formatDelta(delta || emptyDelta()))
        };
    }
    evict() {
        this.userModelStore.evictExpired();
    }
}
function formatPromptFragment(projectId, insights, deltaFragment = '') {
    if (insights.length === 0)
        return '';
    const lines = insights.map((insight) => `- [${insight.category}, confidence=${insight.confidence.toFixed(1)}] ${insight.content}`);
    return ['【用户模型】', `projectId=${projectId}`, deltaFragment, ...lines].filter(Boolean).join('\n');
}
function emptyDelta() {
    return { newInsights: [], strengthenedInsights: [], weakenedInsights: [], expiredInsights: [], snapshotAt: Date.now() };
}
