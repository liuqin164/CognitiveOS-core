export class EvalRunner {
    async runAll() {
        return [];
    }
    async runSuite(name) {
        return {
            suiteName: name,
            runAt: Date.now(),
            metrics: {},
            passed: true,
        };
    }
}
