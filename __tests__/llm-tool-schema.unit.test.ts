/**
 * llm-tool-schema.unit.test.ts
 * Unit tests for LLMToolSchema and ToolCallParser — Phase 46
 */

import { describe, expect, it } from 'bun:test';
import {
  BRAIN_TOOL_SCHEMAS,
  buildToolSchemaBlock,
  getRequiredParams,
} from '../src/routing/LLMToolSchema.js';
import { isFinalAnswer, parse } from '../src/routing/ToolCallParser.js';

// ---------------------------------------------------------------------------
// LLMToolSchema tests
// ---------------------------------------------------------------------------

describe('BRAIN_TOOL_SCHEMAS', () => {
  it('contains exactly 6 tool schemas', () => {
    expect(BRAIN_TOOL_SCHEMAS).toHaveLength(6);
  });

  it('contains brain_recall schema', () => {
    const schema = BRAIN_TOOL_SCHEMAS.find((s) => s.name === 'brain_recall');
    expect(schema).toBeDefined();
    expect(schema!.description).toBeTruthy();
  });

  it('contains get_neuron_context schema', () => {
    const schema = BRAIN_TOOL_SCHEMAS.find((s) => s.name === 'get_neuron_context');
    expect(schema).toBeDefined();
    expect(schema!.description).toBeTruthy();
  });

  it('contains expand_entity schema', () => {
    const schema = BRAIN_TOOL_SCHEMAS.find((s) => s.name === 'expand_entity');
    expect(schema).toBeDefined();
    expect(schema!.description).toBeTruthy();
  });

  it('contains file asset schemas', () => {
    expect(BRAIN_TOOL_SCHEMAS.find((s) => s.name === 'find_file_assets')).toBeDefined();
    expect(BRAIN_TOOL_SCHEMAS.find((s) => s.name === 'get_file_context')).toBeDefined();
  });

  it('contains find_skills schema', () => {
    const schema = BRAIN_TOOL_SCHEMAS.find((s) => s.name === 'find_skills');
    expect(schema).toBeDefined();
    expect(schema!.description).toBeTruthy();
  });

  it('each schema has at least one required param', () => {
    for (const schema of BRAIN_TOOL_SCHEMAS) {
      const required = schema.params.filter((p) => p.required);
      expect(required.length).toBeGreaterThanOrEqual(1);
    }
  });
});

describe('buildToolSchemaBlock', () => {
  it('returns a non-empty string', () => {
    const block = buildToolSchemaBlock();
    expect(typeof block).toBe('string');
    expect(block.length).toBeGreaterThan(0);
  });

  it('contains all tool names', () => {
    const block = buildToolSchemaBlock();
    expect(block).toContain('brain_recall');
    expect(block).toContain('get_neuron_context');
    expect(block).toContain('expand_entity');
    expect(block).toContain('find_file_assets');
    expect(block).toContain('get_file_context');
    expect(block).toContain('find_skills');
  });

  it('contains instruction header', () => {
    const block = buildToolSchemaBlock();
    expect(block).toContain('【可用工具】');
  });

  it('contains JSON format hint', () => {
    const block = buildToolSchemaBlock();
    expect(block).toContain('JSON');
  });

  it('contains final-answer instruction', () => {
    const block = buildToolSchemaBlock();
    expect(block).toContain('自然语言');
  });
});

describe('getRequiredParams', () => {
  it('brain_recall requires query', () => {
    expect(getRequiredParams('brain_recall')).toContain('query');
  });

  it('get_neuron_context requires neuron_id', () => {
    expect(getRequiredParams('get_neuron_context')).toContain('neuron_id');
  });

  it('expand_entity requires entity_name', () => {
    expect(getRequiredParams('expand_entity')).toContain('entity_name');
  });

  it('file tools require stable locators', () => {
    expect(getRequiredParams('find_file_assets')).toContain('query');
    expect(getRequiredParams('get_file_context')).toContain('asset_id');
    expect(getRequiredParams('get_file_context')).toContain('chunk_index');
  });

  it('find_skills requires query', () => {
    expect(getRequiredParams('find_skills')).toContain('query');
  });
});

// ---------------------------------------------------------------------------
// ToolCallParser tests
// ---------------------------------------------------------------------------

describe('parse — brain_recall', () => {
  it('parses a clean brain_recall JSON', () => {
    const input = JSON.stringify({ action: 'brain_recall', query: 'bluetooth earphone' });
    const result = parse(input);
    expect(result).not.toBeNull();
    expect(result!.action).toBe('brain_recall');
    expect(result!.query).toBe('bluetooth earphone');
  });

  it('parses brain_recall with optional fields', () => {
    const input = JSON.stringify({
      action: 'brain_recall',
      query: 'headphone issue',
      entity_hint: 'headphone',
      limit: 8,
      reason: 'need full history',
    });
    const result = parse(input);
    expect(result).not.toBeNull();
    expect(result!.entity_hint).toBe('headphone');
    expect(result!.limit).toBe(8);
    expect(result!.reason).toBe('need full history');
  });

  it('returns null when query is missing', () => {
    const input = JSON.stringify({ action: 'brain_recall' });
    expect(parse(input)).toBeNull();
  });

  it('returns null when query is empty string', () => {
    const input = JSON.stringify({ action: 'brain_recall', query: '' });
    expect(parse(input)).toBeNull();
  });
});

describe('parse — get_neuron_context', () => {
  it('parses get_neuron_context', () => {
    const input = JSON.stringify({ action: 'get_neuron_context', neuron_id: 'nrn-001' });
    const result = parse(input);
    expect(result).not.toBeNull();
    expect(result!.action).toBe('get_neuron_context');
    expect(result!.neuron_id).toBe('nrn-001');
  });

  it('returns null when neuron_id is missing', () => {
    const input = JSON.stringify({ action: 'get_neuron_context' });
    expect(parse(input)).toBeNull();
  });
});

describe('parse — expand_entity', () => {
  it('parses expand_entity', () => {
    const input = JSON.stringify({ action: 'expand_entity', entity_name: 'Alice' });
    const result = parse(input);
    expect(result).not.toBeNull();
    expect(result!.action).toBe('expand_entity');
    expect(result!.entity_name).toBe('Alice');
  });

  it('parses expand_entity with optional entity_type', () => {
    const input = JSON.stringify({ action: 'expand_entity', entity_name: 'Alice', entity_type: 'person' });
    const result = parse(input);
    expect(result!.entity_type).toBe('person');
  });

  it('returns null when entity_name is missing', () => {
    const input = JSON.stringify({ action: 'expand_entity' });
    expect(parse(input)).toBeNull();
  });
});

describe('parse — file tools', () => {
  it('parses find_file_assets', () => {
    const input = JSON.stringify({ action: 'find_file_assets', query: 'orders', extension: '.xlsx' });
    const result = parse(input);
    expect(result).not.toBeNull();
    expect(result!.action).toBe('find_file_assets');
    expect(result!.extension).toBe('.xlsx');
  });

  it('parses get_file_context', () => {
    const input = JSON.stringify({ action: 'get_file_context', asset_id: 'asset-1', chunk_index: 2, radius: 1 });
    const result = parse(input);
    expect(result).not.toBeNull();
    expect(result!.action).toBe('get_file_context');
    expect(result!.asset_id).toBe('asset-1');
    expect(result!.chunk_index).toBe(2);
  });
});

describe('parse — tolerant parsing', () => {
  it('tolerates prefix text before JSON', () => {
    const input = `I need more context.\n${JSON.stringify({ action: 'brain_recall', query: 'test query' })}`;
    const result = parse(input);
    expect(result).not.toBeNull();
    expect(result!.action).toBe('brain_recall');
  });

  it('tolerates suffix text after JSON', () => {
    const input = `${JSON.stringify({ action: 'brain_recall', query: 'test query' })}\nSome trailing text.`;
    const result = parse(input);
    expect(result).not.toBeNull();
  });

  it('tolerates whitespace-padded JSON', () => {
    const input = `   \n   ${JSON.stringify({ action: 'expand_entity', entity_name: 'Bob' })}   \n`;
    const result = parse(input);
    expect(result).not.toBeNull();
  });
});

describe('parse — invalid / final answer cases', () => {
  it('returns null for plain natural language answer', () => {
    const input = '根据记忆，你的蓝牙耳机在上周三出现了连接问题...';
    expect(parse(input)).toBeNull();
  });

  it('returns null for unknown action', () => {
    const input = JSON.stringify({ action: 'delete_memory', target: 'all' });
    expect(parse(input)).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(parse('')).toBeNull();
  });

  it('returns null for JSON array (not object)', () => {
    const input = '[{"action":"brain_recall","query":"test"}]';
    expect(parse(input)).toBeNull();
  });

  it('returns null when action field is missing', () => {
    const input = JSON.stringify({ query: 'something', entity_hint: 'foo' });
    expect(parse(input)).toBeNull();
  });

  it('returns null for malformed JSON', () => {
    const input = '{ action: brain_recall, query: "test" }';
    expect(parse(input)).toBeNull();
  });
});

describe('isFinalAnswer', () => {
  it('returns true for natural language answer', () => {
    expect(isFinalAnswer('好的，根据记忆，...')).toBe(true);
  });

  it('returns false for a valid tool call', () => {
    const input = JSON.stringify({ action: 'brain_recall', query: 'test' });
    expect(isFinalAnswer(input)).toBe(false);
  });

  it('returns true for empty string', () => {
    expect(isFinalAnswer('')).toBe(true);
  });

  it('returns true for text with invalid action', () => {
    const input = JSON.stringify({ action: 'unknown_tool', param: 'x' });
    expect(isFinalAnswer(input)).toBe(true);
  });
});
