import { EvalRunner, type EvalSuiteResult } from '../eval/runners/EvalRunner.js';
import { BENCHMARK_GROUPS, getBenchmarkGroup, type BenchmarkGroup, type BenchmarkGroupBaseline } from './BenchmarkRegistry.js';

export interface BenchmarkBaselineResult {
  label: string;
  value: number;
  passed: boolean;
  formatted: string;
  operator: BenchmarkGroupBaseline['operator'];
  threshold: number;
  formatAs: BenchmarkGroupBaseline['formatAs'];
}

export interface BenchmarkGroupResult {
  group: BenchmarkGroup;
  suiteResult: EvalSuiteResult;
  baselineResults: BenchmarkBaselineResult[];
  passed: boolean;
}

export class BenchmarkRunner {
  private evalRunner: EvalRunner;

  constructor(evalRunner?: EvalRunner) {
    this.evalRunner = evalRunner ?? new EvalRunner();
  }

  async runAll(): Promise<BenchmarkGroupResult[]> {
    return Promise.all(BENCHMARK_GROUPS.map((group) => this.runGroup(group.name)));
  }

  async runGroup(groupName: string): Promise<BenchmarkGroupResult> {
    const group = getBenchmarkGroup(groupName);
    if (!group) {
      throw new Error(`Unknown benchmark group: ${groupName}`);
    }

    const suiteResult = await this.evalRunner.runSuite(group.suiteName);
    const baselineResults = group.baselines.map((baseline) => {
      const rawValue = suiteResult.metrics[baseline.metricKey];
      const value = typeof rawValue === 'number' ? rawValue : 0;

      return {
        label: baseline.label,
        value,
        passed: this.checkBaseline(value, baseline.operator, baseline.threshold),
        formatted: this.formatValue(value, baseline.formatAs),
        operator: baseline.operator,
        threshold: baseline.threshold,
        formatAs: baseline.formatAs
      };
    });

    return {
      group,
      suiteResult,
      baselineResults,
      passed: baselineResults.every((result) => result.passed)
    };
  }

  private checkBaseline(value: number, operator: BenchmarkGroupBaseline['operator'], threshold: number): boolean {
    switch (operator) {
      case '<=':
        return value <= threshold;
      case '>=':
        return value >= threshold;
      case '=':
        return Math.abs(value - threshold) < 0.001;
      case '<':
        return value < threshold;
      default:
        return false;
    }
  }

  private formatValue(value: number, formatAs: BenchmarkGroupBaseline['formatAs']): string {
    switch (formatAs) {
      case 'percent':
        return `${(value * 100).toFixed(1)}%`;
      case 'ms':
        return `${value.toFixed(0)}ms`;
      case 'rate':
        return `${(value * 100).toFixed(1)}%`;
      default:
        return String(value);
    }
  }
}
