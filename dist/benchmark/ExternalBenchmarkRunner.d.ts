import { type LongMemEvalBrain, type LongMemEvalMetrics } from './LongMemEvalAdapter.js';
export declare class ExternalBenchmarkRunner {
    private readonly brain;
    private readonly datasetPath;
    constructor(brain: LongMemEvalBrain, datasetPath: string);
    runLongMemEval(): Promise<LongMemEvalMetrics>;
}
//# sourceMappingURL=ExternalBenchmarkRunner.d.ts.map