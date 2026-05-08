import type { BenchmarkBaselineResult, BenchmarkGroupResult } from './BenchmarkRunner.js';

export interface PersistedBenchmarkGroup {
  name: string;
  passed: boolean;
  baselines: BenchmarkBaselineResult[];
}

export interface PersistedBenchmarkReport {
  generatedAt: number;
  version: string;
  passed: boolean;
  groups: PersistedBenchmarkGroup[];
}

export class BenchmarkReport {
  formatConsole(results: BenchmarkGroupResult[]): string {
    return this.formatConsoleFromPersisted(this.toPersistedReport(results));
  }

  formatConsoleFromPersisted(report: PersistedBenchmarkReport): string {
    const lines: string[] = [
      'agent-brain v0.8 Benchmark Report',
      '=================================='
    ];

    for (const result of report.groups) {
      const firstBaseline = result.baselines[0];
      if (!firstBaseline) {
        continue;
      }

      lines.push(this.formatBaselineLine(result.name, firstBaseline, result.passed));

      for (let index = 1; index < result.baselines.length; index += 1) {
        const baseline = result.baselines[index];
        if (!baseline) {
          continue;
        }

        lines.push(this.formatBaselineLine('', baseline, baseline.passed));
      }
    }

    lines.push('');
    lines.push(
      report.passed
        ? `All ${report.groups.length} benchmark suites passed. ✓`
        : `${report.groups.filter((group) => !group.passed).length} suite(s) FAILED. ✗`
    );

    return lines.join('\n');
  }

  formatJson(results: BenchmarkGroupResult[]): string {
    return JSON.stringify(this.toPersistedReport(results), null, 2);
  }

  async writeJson(results: BenchmarkGroupResult[], outputPath: string): Promise<void> {
    await Bun.write(outputPath, `${this.formatJson(results)}\n`);
  }

  async readJson(inputPath: string): Promise<PersistedBenchmarkReport> {
    const raw = await Bun.file(inputPath).text();
    return JSON.parse(raw) as PersistedBenchmarkReport;
  }

  private toPersistedReport(results: BenchmarkGroupResult[]): PersistedBenchmarkReport {
    return {
      generatedAt: Date.now(),
      version: '0.8',
      passed: results.every((result) => result.passed),
      groups: results.map((result) => ({
        name: result.group.name,
        passed: result.passed,
        baselines: result.baselineResults
      }))
    };
  }

  private formatBaselineLine(groupName: string, baseline: BenchmarkBaselineResult, passed: boolean): string {
    const mark = passed ? '✓' : '✗';
    return `${groupName.padEnd(26)} ${baseline.label}=${baseline.formatted.padEnd(10)} (baseline ${this.formatBaselineDesc(baseline)}) ${mark}`;
  }

  private formatBaselineDesc(baseline: Pick<BenchmarkBaselineResult, 'operator' | 'threshold' | 'formatAs'>): string {
    const threshold = baseline.formatAs === 'ms'
      ? `${baseline.threshold}ms`
      : `${(baseline.threshold * 100).toFixed(1)}%`;

    return `${baseline.operator}${threshold}`;
  }
}
