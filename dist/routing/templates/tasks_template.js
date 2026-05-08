export function formatTasksReply(data) {
    if (isCommandResult(data)) {
        return data.message || (data.success ? '任务操作已处理。' : '任务操作未执行。');
    }
    const tasks = extractArray(data, ['tasks']);
    if (tasks.length === 0) {
        return '当前没有进行中的任务。';
    }
    const lines = tasks.map((task) => {
        const record = asRecord(task);
        const status = stringify(record.status) || 'unknown';
        const taskId = stringify(record.taskId ?? record.id) || 'unknown';
        const goal = stringify(record.goalDescription ?? record.goalText ?? record.currentPhase) || taskId;
        return `• [${status}] ${goal} (${taskId})`;
    });
    return `共 ${tasks.length} 个任务：\n${lines.join('\n')}`;
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
function isCommandResult(data) {
    const record = asRecord(data);
    return typeof record.success === 'boolean';
}
function asRecord(data) {
    return data && typeof data === 'object' && !Array.isArray(data)
        ? data
        : {};
}
function stringify(value) {
    return typeof value === 'string' ? value : '';
}
