const DAY_MS = 24 * 60 * 60 * 1000;
export class DecayPolicy {
    options;
    decayThresholdDays;
    decayFactor;
    minWeight;
    constructor(options = {}) {
        this.options = options;
        this.decayThresholdDays = options.decayThresholdDays ?? 30;
        this.decayFactor = options.decayFactor ?? 0.8;
        this.minWeight = options.minWeight ?? 0.1;
    }
    computeWeight(params) {
        const now = params.now ?? Date.now();
        const baseWeight = params.baseWeight ?? 1.0;
        const elapsedMs = Math.max(0, now - params.lastAccessedAt);
        if (elapsedMs < DAY_MS) {
            return Math.max(baseWeight, this.minWeight);
        }
        const elapsedDays = elapsedMs / DAY_MS;
        const periods = elapsedDays / this.decayThresholdDays;
        const weight = baseWeight * (this.decayFactor ** periods);
        return Math.max(weight, this.minWeight);
    }
    isExcluded(weight) {
        return weight < this.minWeight;
    }
}
