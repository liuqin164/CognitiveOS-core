import { EvalRunner, type EvalSuiteResult } from '../eval/runners/EvalRunner.js';
import { type BenchmarkGroup, type BenchmarkGroupBaseline } from './BenchmarkRegistry.js';
export interface BenchmarkBaselineResult {
    metricKey: string;
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
export declare class BenchmarkRunner {
    private evalRunner;
    constructor(evalRunner?: EvalRunner);
    runAll(): Promise<BenchmarkGroupResult[]>;
    runGroup(groupName: string): Promise<BenchmarkGroupResult>;
    private checkBaseline;
    private formatValue;
}
//# sourceMappingURL=BenchmarkRunner.d.ts.map