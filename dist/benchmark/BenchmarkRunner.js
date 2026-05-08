import { EvalRunner } from '../eval/runners/EvalRunner.js';
import { BENCHMARK_GROUPS, getBenchmarkGroup } from './BenchmarkRegistry.js';
export class BenchmarkRunner {
    evalRunner;
    constructor(evalRunner) {
        this.evalRunner = evalRunner ?? new EvalRunner();
    }
    async runAll() {
        return Promise.all(BENCHMARK_GROUPS.map((group) => this.runGroup(group.name)));
    }
    async runGroup(groupName) {
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
    checkBaseline(value, operator, threshold) {
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
    formatValue(value, formatAs) {
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
