import { LongMemEvalAdapter } from './LongMemEvalAdapter.js';
export class ExternalBenchmarkRunner {
    brain;
    datasetPath;
    constructor(brain, datasetPath) {
        this.brain = brain;
        this.datasetPath = datasetPath;
    }
    async runLongMemEval() {
        return new LongMemEvalAdapter(this.brain).runDataset(this.datasetPath);
    }
}
