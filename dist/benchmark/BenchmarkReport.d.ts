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
export declare class BenchmarkReport {
    formatConsole(results: BenchmarkGroupResult[]): string;
    formatConsoleFromPersisted(report: PersistedBenchmarkReport): string;
    formatJson(results: BenchmarkGroupResult[]): string;
    writeJson(results: BenchmarkGroupResult[], outputPath: string): Promise<void>;
    readJson(inputPath: string): Promise<PersistedBenchmarkReport>;
    private toPersistedReport;
    private formatBaselineLine;
    private formatBaselineDesc;
}
//# sourceMappingURL=BenchmarkReport.d.ts.map