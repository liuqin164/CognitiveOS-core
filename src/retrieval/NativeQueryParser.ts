import type { NativeQueryDirectives } from '../types/query-ir.js';

export interface NativeQueryClause {
  key: keyof NativeQueryDirectives;
  value: string;
  raw: string;
  start: number;
  end: number;
}

export interface NativeQueryParseResult {
  directives?: NativeQueryDirectives;
  clauses: NativeQueryClause[];
  residualQuery: string;
  parseMode: 'grammar';
}

const DIRECTIVE_KEYS = new Set<keyof NativeQueryDirectives>([
  'entity',
  'entityType',
  'project',
  'branch',
  'task',
  'cluster',
  'time',
  'from',
  'to',
  'around',
  'mode'
]);

export class NativeQueryParser {
  private static readonly KEY_ALIASES: Record<string, keyof NativeQueryDirectives> = {
    entity: 'entity',
    entitytype: 'entityType',
    project: 'project',
    branch: 'branch',
    task: 'task',
    cluster: 'cluster',
    time: 'time',
    from: 'from',
    to: 'to',
    around: 'around',
    mode: 'mode'
  };

  parse(query: string): NativeQueryParseResult {
    const clauses: NativeQueryClause[] = [];
    const consumed: Array<{ start: number; end: number }> = [];
    let index = 0;

    while (index < query.length) {
      index = this.skipWhitespace(query, index);
      const keyMatch = this.readIdentifier(query, index);
      if (!keyMatch) {
        index += 1;
        continue;
      }

      const key = NativeQueryParser.KEY_ALIASES[keyMatch.value.toLowerCase()];
      const colonIndex = this.skipWhitespace(query, keyMatch.end);
      if (!key || !DIRECTIVE_KEYS.has(key) || query[colonIndex] !== ':') {
        index = keyMatch.end;
        continue;
      }

      const valueStart = this.skipWhitespace(query, colonIndex + 1);
      const valueMatch = this.readValue(query, valueStart);
      if (!valueMatch) {
        index = colonIndex + 1;
        continue;
      }

      clauses.push({
        key,
        value: valueMatch.value,
        raw: query.slice(index, valueMatch.end),
        start: index,
        end: valueMatch.end
      });
      consumed.push({ start: index, end: valueMatch.end });
      index = valueMatch.end;
    }

    const directives = clauses.reduce<NativeQueryDirectives>((acc, clause) => {
      if (clause.key === 'mode') {
        if (clause.value === 'continuous' || clause.value === 'focused') acc.mode = clause.value;
        return acc;
      }
      acc[clause.key] = clause.value;
      return acc;
    }, {});

    return {
      directives: Object.keys(directives).length > 0 ? directives : undefined,
      clauses,
      residualQuery: this.buildResidualQuery(query, consumed),
      parseMode: 'grammar'
    };
  }

  private buildResidualQuery(query: string, consumed: Array<{ start: number; end: number }>): string {
    if (consumed.length === 0) return query.trim();

    const sorted = consumed.slice().sort((a, b) => a.start - b.start);
    let cursor = 0;
    const parts: string[] = [];

    for (const range of sorted) {
      if (cursor < range.start) parts.push(query.slice(cursor, range.start));
      cursor = range.end;
    }
    if (cursor < query.length) parts.push(query.slice(cursor));

    return parts.join(' ').replace(/\s+/g, ' ').trim();
  }

  private readIdentifier(query: string, index: number): { value: string; end: number } | null {
    const match = query.slice(index).match(/^([A-Za-z_][A-Za-z0-9_]*)/);
    if (!match) return null;
    return {
      value: match[1],
      end: index + match[1].length
    };
  }

  private readValue(query: string, index: number): { value: string; end: number } | null {
    const quote = query[index];
    if (quote === '"' || quote === '\'') {
      let cursor = index + 1;
      while (cursor < query.length) {
        if (query[cursor] === quote && query[cursor - 1] !== '\\') {
          return {
            value: query.slice(index + 1, cursor).trim(),
            end: cursor + 1
          };
        }
        cursor += 1;
      }
      return {
        value: query.slice(index + 1).trim(),
        end: query.length
      };
    }

    let cursor = index;
    while (cursor < query.length) {
      const char = query[cursor];
      if (/\s/.test(char)) break;
      cursor += 1;
    }

    const value = query.slice(index, cursor).trim();
    return value.length > 0 ? { value, end: cursor } : null;
  }

  private skipWhitespace(query: string, index: number): number {
    let cursor = index;
    while (cursor < query.length && /\s/.test(query[cursor] || '')) cursor += 1;
    return cursor;
  }
}
