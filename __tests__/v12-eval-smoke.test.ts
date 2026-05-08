import { describe, expect, it } from 'bun:test';
import { BenchmarkRunner } from '../src/benchmark/BenchmarkRunner.js';
import { BENCHMARK_GROUPS } from '../src/benchmark/BenchmarkRegistry.js';

describe('v1.2 eval smoke', () => {
  it('registers tool_use_quality benchmark group', () => {
    expect(BENCHMARK_GROUPS.some((group) => group.name === 'tool_use_quality')).toBe(true);
  });

  it('runs tool_use_quality through BenchmarkRunner', async () => {
    const result = await new BenchmarkRunner().runGroup('tool_use_quality');
    expect(result.group.suiteName).toBe('tool_use_quality');
    expect(result.passed).toBe(true);
  });
});
