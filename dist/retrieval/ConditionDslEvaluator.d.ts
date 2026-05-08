export interface ConditionEvaluationContext {
    projectId?: string;
    rawQuery?: string;
    conditionHints?: string[];
    entityHints?: string[];
    environmentHints?: string[];
    stateHints?: string[];
    policyHints?: string[];
}
export declare class ConditionDslEvaluator {
    private static readonly VALUE_ALIASES;
    static evaluate(dsl: unknown, context: ConditionEvaluationContext): {
        matched: boolean;
        score: number;
        reasons: string[];
        executionReady: boolean;
        normalizedContext: Record<string, string[]>;
        policyActions: Array<{
            policy: string;
            action: 'allow' | 'deny' | 'prefer';
        }>;
    };
    private static evaluateNode;
    private static evaluateLeaf;
    private static toCorpus;
    private static normalizeValue;
    private static matchesValue;
    private static buildNormalizedContext;
    private static buildPolicyActions;
    private static rehydrateFromFlatClauses;
    private static hasExplicitNegation;
}
//# sourceMappingURL=ConditionDslEvaluator.d.ts.map