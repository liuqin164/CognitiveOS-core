export declare class DecayPolicy {
    private options;
    private readonly decayThresholdDays;
    private readonly decayFactor;
    private readonly minWeight;
    constructor(options?: {
        decayThresholdDays?: number;
        decayFactor?: number;
        minWeight?: number;
    });
    computeWeight(params: {
        baseWeight?: number;
        lastAccessedAt: number;
        now?: number;
    }): number;
    isExcluded(weight: number): boolean;
}
//# sourceMappingURL=DecayPolicy.d.ts.map