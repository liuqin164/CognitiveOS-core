export function formatCapabilitiesReply(data) {
    const capabilities = extractArray(data, ['capabilities', 'items']);
    if (capabilities.length === 0) {
        return '当前没有可用能力信息。';
    }
    const lines = capabilities.map((item) => {
        const capability = asRecord(item);
        const id = stringify(capability.id) || 'unknown';
        const description = stringify(capability.description) || '无描述';
        const type = stringify(capability.type) || 'unknown';
        return `• ${id} [${type}] ${description}`;
    });
    return `当前可用能力 ${capabilities.length} 项：\n${lines.join('\n')}`;
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
