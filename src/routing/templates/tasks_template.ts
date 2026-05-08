export function formatTasksReply(data: unknown): string {
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

function extractArray(data: unknown, keys: string[]): unknown[] {
  if (Array.isArray(data)) {
    return data;
  }

  const record = asRecord(data);
  for (const key of keys) {
    if (Array.isArray(record[key])) {
      return record[key] as unknown[];
    }
  }

  return [];
}

function isCommandResult(data: unknown): data is { success: boolean; message?: string } {
  const record = asRecord(data);
  return typeof record.success === 'boolean';
}

function asRecord(data: unknown): Record<string, unknown> {
  return data && typeof data === 'object' && !Array.isArray(data)
    ? data as Record<string, unknown>
    : {};
}

function stringify(value: unknown): string {
  return typeof value === 'string' ? value : '';
}
