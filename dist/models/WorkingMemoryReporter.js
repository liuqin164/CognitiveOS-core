export class WorkingMemoryReporter {
    userModelStore;
    constructor(userModelStore) {
        this.userModelStore = userModelStore;
    }
    computeDelta(projectId, previousSnapshot) {
        const current = this.userModelStore.query(projectId, { minConfidence: 0, limit: Number.MAX_SAFE_INTEGER });
        const previousByKey = new Map(previousSnapshot.map((insight) => [insightKey(insight), insight]));
        const currentByKey = new Map(current.map((insight) => [insightKey(insight), insight]));
        const newInsights = current.filter((insight) => !previousByKey.has(insightKey(insight)));
        const strengthenedInsights = current.filter((insight) => (insight.confidence - (previousByKey.get(insightKey(insight))?.confidence ?? insight.confidence)) >= 0.2);
        const weakenedInsights = current.filter((insight) => (insight.confidence - (previousByKey.get(insightKey(insight))?.confidence ?? insight.confidence)) <= -0.2);
        const expiredInsights = previousSnapshot.filter((insight) => !currentByKey.has(insightKey(insight)));
        return { newInsights, strengthenedInsights, weakenedInsights, expiredInsights, snapshotAt: Date.now() };
    }
    formatDelta(delta) {
        const lines = [];
        if (delta.newInsights.length)
            lines.push(`新出现：${delta.newInsights.map(formatInsight).join('；')}`);
        if (delta.strengthenedInsights.length)
            lines.push(`增强：${delta.strengthenedInsights.map(formatTrend).join('；')}`);
        if (delta.weakenedInsights.length)
            lines.push(`减弱：${delta.weakenedInsights.map(formatTrend).join('；')}`);
        if (delta.expiredInsights.length)
            lines.push(`过期：${delta.expiredInsights.map((insight) => insight.content).join('；')}`);
        return lines.length ? ['[近期变化]', ...lines].join('\n') : '';
    }
}
function insightKey(insight) {
    return `${insight.projectId}|${insight.category}|${insight.content}`;
}
function formatInsight(insight) {
    return `${insight.content}（置信度 ${insight.confidence.toFixed(1)}）`;
}
function formatTrend(insight) {
    const from = Math.max(0, Math.min(1, insight.confidence - (insight.confidenceDelta ?? 0)));
    return `${insight.content}（${from.toFixed(1)} -> ${insight.confidence.toFixed(1)}）`;
}
