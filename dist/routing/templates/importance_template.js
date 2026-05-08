export function formatImportanceReply(data) {
    if (isCommandResult(data)) {
        return data.message || (data.success ? '已更新重要记忆标记。' : '重要记忆操作失败。');
    }
    const memories = Array.isArray(data) ? data : [];
    if (memories.length === 0) {
        return '当前没有标记为重要或永久的记忆。';
    }
    const lines = memories.slice(0, 20).map((item) => {
        const record = item && typeof item === 'object' ? item : {};
        const metadata = record.metadata && typeof record.metadata === 'object' ? record.metadata : {};
        const level = metadata.importanceLevel || 'important';
        const createdAt = typeof metadata.createdAt === 'number'
            ? new Date(metadata.createdAt).toISOString()
            : 'unknown time';
        const content = String(record.content || '').replace(/\s+/g, ' ').slice(0, 120) || '无内容';
        return `• [${level}] ${createdAt} ${content}`;
    });
    return `共找到 ${memories.length} 条重要记忆：\n${lines.join('\n')}`;
}
function isCommandResult(data) {
    return Boolean(data && typeof data === 'object' && 'message' in data);
}
