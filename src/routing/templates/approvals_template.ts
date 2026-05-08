export function formatApprovalsReply(data: unknown): string {
  if (isCommandResult(data)) {
    return data.message || (data.success ? '确认请求已处理。' : '确认请求未执行。');
  }

  const items = extractArray(data, ['approvals', 'items']);
  if (items.length === 0) {
    return '当前没有等待确认的项目。';
  }

  const lines = items.map((item) => {
    const approval = asRecord(item);
    const id = stringify(approval.id) || 'unknown';
    const action = stringify(
      approval.action
      ?? approval.description
      ?? approval.capabilityId
    ) || '操作';
    const riskLevel = stringify(approval.riskLevel) || '未知';
    return `• [${id}] ${action} (风险: ${riskLevel})`;
  });

  return `${items.length} 项等待确认：\n${lines.join('\n')}`;
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
