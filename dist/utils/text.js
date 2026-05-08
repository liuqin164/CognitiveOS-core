export function lexicalSimilarity(a, b) {
    const aTokens = tokenSet(a);
    const bTokens = tokenSet(b);
    if (aTokens.size === 0 || bTokens.size === 0)
        return 0;
    let overlap = 0;
    for (const token of aTokens) {
        if (bTokens.has(token))
            overlap++;
    }
    return overlap / Math.max(aTokens.size, bTokens.size);
}
function tokenSet(text) {
    return new Set(text
        .toLowerCase()
        .split(/[\s,，。！？、:：/._-]+/)
        .map((token) => token.trim())
        .filter(Boolean));
}
