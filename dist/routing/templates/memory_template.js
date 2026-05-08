export function formatMemoryReply(data) {
    if (typeof data === 'number') {
        return `当前记忆条目数：${data}`;
    }
    const facts = extractArray(data, ['facts', 'items', 'memories']);
    if (facts.length === 0) {
        return '当前没有可展示的记忆。';
    }
    const lines = facts.map((item) => {
        const fact = asRecord(item);
        const subject = stringify(fact.subject) || 'unknown';
        const predicate = stringify(fact.predicateFamily) || 'fact';
        const value = stringify(fact.predicateValue ?? fact.object ?? fact.sourceText) || '无内容';
        return `• ${subject} ${predicate}: ${value}`;
    });
    return `共找到 ${facts.length} 条记忆：\n${lines.join('\n')}`;
}
function extractArray(data, keys) {
    if (Array.isArray(data)) {
        return data;
    }
    const record = asRecord(data);
    for (const key of keys) {
        if (Array.isArray(record[key])) {
            return record[key];
        }
    }
    return [];
}
function asRecord(data) {
    return data && typeof data === 'object' && !Array.isArray(data)
        ? data
        : {};
}
function stringify(value) {
    return typeof value === 'string' ? value : '';
}
