import { describe, expect, it } from 'bun:test';
import { BenchmarkRunner } from '../src/benchmark/BenchmarkRunner.js';

describe('active memory query eval benchmark', () => {
  it('passes tool_use_quality benchmark group', async () => {
    const result = await new BenchmarkRunner().runGroup('tool_use_quality');
    expect(result.passed).toBe(true);
    expect(result.baselineResults).toHaveLength(5);
  });
});
