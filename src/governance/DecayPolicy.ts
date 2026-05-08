const DAY_MS = 24 * 60 * 60 * 1000;

export class DecayPolicy {
  private readonly decayThresholdDays: number;
  private readonly decayFactor: number;
  private readonly minWeight: number;

  constructor(private options: {
    decayThresholdDays?: number;
    decayFactor?: number;
    minWeight?: number;
  } = {}) {
    this.decayThresholdDays = options.decayThresholdDays ?? 30;
    this.decayFactor = options.decayFactor ?? 0.8;
    this.minWeight = options.minWeight ?? 0.1;
  }

  computeWeight(params: {
    baseWeight?: number;
    lastAccessedAt: number;
    now?: number;
  }): number {
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

  isExcluded(weight: number): boolean {
    return weight < this.minWeight;
  }
}
