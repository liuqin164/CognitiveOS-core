export function formatContradictionsReply(data: unknown): string {
  const items = extractArray(data, ['contradictions', 'items']);
  if (items.length === 0) {
    return '当前没有待确认的记忆矛盾。';
  }

  const lines = items.map((item) => {
    const contradiction = asRecord(item);
    const id = stringify(contradiction.contradictionId) || 'unknown';
    const subject = stringify(contradiction.subject) || 'unknown';
    const predicate = stringify(contradiction.predicateFamily) || 'fact';
    const oldValue = stringify(contradiction.existingValue) || '无内容';
    const newValue = stringify(contradiction.newValue) || '无内容';
    return `• [${id}] ${subject} ${predicate}: 旧值「${oldValue}」 / 新值「${newValue}」`;
  });

  return `${items.length} 项记忆矛盾待确认：\n${lines.join('\n')}`;
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

function asRecord(data: unknown): Record<string, unknown> {
  return data && typeof data === 'object' && !Array.isArray(data)
    ? data as Record<string, unknown>
    : {};
}

function stringify(value: unknown): string {
  return typeof value === 'string' ? value : '';
}
