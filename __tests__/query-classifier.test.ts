// ============================================
// 查询分类器测试
// ============================================

import { describe, it, expect } from 'bun:test';
import { QueryClassifier } from '../src/core/QueryClassifier.js';
import { BrainMode } from '../src/types/index.js';

describe('QueryClassifier', () => {
  it('should classify code query as HARD', () => {
    const result = QueryClassifier.classify('function test() { return true; }');

    expect(result.type).toBe('HARD');
    expect(result.confidence).toBeGreaterThan(0.8);
  });

  it('should classify file path query as HARD', () => {
    const result = QueryClassifier.classify('/src/utils/hash.ts');

    expect(result.type).toBe('HARD');
  });

  it('should classify natural language query as FUZZY', () => {
    const result = QueryClassifier.classify('what is the best way to handle errors?');

    expect(result.type).toBe('FUZZY');
  });

  it('should classify recent query as FUZZY', () => {
    const result = QueryClassifier.classify('show me recent changes');

    expect(result.type).toBe('FUZZY');
  });

  it('should classify standard query as STANDARD', () => {
    const result = QueryClassifier.classify('memory database implementation');

    expect(result.type).toBe('STANDARD');
  });

  it('should detect fix keyword as HARD', () => {
    const result = QueryClassifier.classify('fix the memory leak issue');

    expect(result.type).toBe('HARD');
  });

  it('should detect bug keyword as HARD', () => {
    const result = QueryClassifier.classify('debug the connection error');

    expect(result.type).toBe('HARD');
  });

  it('should return FULL mode by default', () => {
    const result = QueryClassifier.classify('test query');

    expect(result.mode).toBe(BrainMode.FULL);
  });

  it('should get current mode', () => {
    const mode = QueryClassifier.getCurrentMode();

    expect(mode).toBeDefined();
    expect(['FULL', 'NO_SYNAPSE', 'TEXT_ONLY']).toContain(mode);
  });

  it('should get degradation state', () => {
    const state = QueryClassifier.getDegradationState();

    expect(state).toBeDefined();
    expect(state.mode).toBeDefined();
    expect(state.trigger).toBeDefined();
    expect(state.timestamp).toBeDefined();
    expect(state.timestamp).toBeGreaterThan(0);
  });
});