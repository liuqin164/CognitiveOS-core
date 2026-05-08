import { LongMemEvalAdapter, type LongMemEvalBrain, type LongMemEvalMetrics } from './LongMemEvalAdapter.js';

export class ExternalBenchmarkRunner {
  constructor(
    private readonly brain: LongMemEvalBrain,
    private readonly datasetPath: string
  ) {}

  async runLongMemEval(): Promise<LongMemEvalMetrics> {
    return new LongMemEvalAdapter(this.brain).runDataset(this.datasetPath);
  }
}

