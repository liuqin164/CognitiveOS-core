import type { EvalSuiteName } from '../eval/runners/EvalRunner.js';
export interface BenchmarkGroupBaseline {
    metricKey: string;
    label: string;
    operator: '<=' | '>=' | '=' | '<';
    threshold: number;
    formatAs: 'percent' | 'ms' | 'rate';
}
export interface BenchmarkGroup {
    name: string;
    suiteName: EvalSuiteName;
    baselines: BenchmarkGroupBaseline[];
}
export declare const BENCHMARK_GROUPS: BenchmarkGroup[];
export declare function getBenchmarkGroup(groupName: string): BenchmarkGroup | undefined;
//# sourceMappingURL=BenchmarkRegistry.d.ts.map