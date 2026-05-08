import { EvalRunner, type EvalSuiteResult } from '../eval/runners/EvalRunner.js';
import { BenchmarkRunner, type BenchmarkGroupResult } from '../benchmark/BenchmarkRunner.js';
import { ProposalConfigOverlay } from './ProposalConfigOverlay.js';
import { ProposalLedger } from './ProposalLedger.js';
export interface RegressionDetail {
    groupName: string;
    metricLabel: string;
    currentValue: number;
    threshold: number;
    operator: string;
}
export interface ProposalVerdict {
    proposalId: string;
    ranAt: number;
    evalResults: EvalSuiteResult[];
    benchmarkResults: BenchmarkGroupResult[];
    regressions: RegressionDetail[];
    passed: boolean;
    reportText: string;
    reportPath?: string;
}
export declare class ProposalEvalRunner {
    private ledger;
    private evalRunner;
    private readonly benchmarkRunner;
    private readonly report;
    constructor(ledger: ProposalLedger, evalRunner: EvalRunner, benchmarkRunner?: BenchmarkRunner);
    evaluate(proposalId: string, overlay?: ProposalConfigOverlay): Promise<ProposalVerdict>;
    private resolveGroupsToRun;
}
//# sourceMappingURL=ProposalEvalRunner.d.ts.map