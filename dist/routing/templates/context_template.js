export function formatContextReply(data) {
    const context = asRecord(data);
    const used = numberOrNull(context.used ?? context.estimatedTokens);
    const budget = numberOrNull(context.budget);
    const ratio = numberOrNull(context.ratio);
    const factCount = numberOrNull(context.factCount);
    if (used === null && budget === null && ratio === null && factCount === null) {
        return '当前没有上下文摘要。';
    }
    const lines = [
        `Token used: ${used ?? 0}`,
        `Token budget: ${budget ?? 0}`,
        `Usage ratio: ${ratio !== null ? ratio.toFixed(2) : '0.00'}`,
        `Fact count: ${factCount ?? 0}`
    ];
    return `当前上下文摘要：\n${lines.join('\n')}`;
}
function asRecord(data) {
    return data && typeof data === 'object' && !Array.isArray(data)
        ? data
        : {};
}
function numberOrNull(value) {
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
}
