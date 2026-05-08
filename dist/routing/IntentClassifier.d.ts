import type { IntentType } from './TaskPlan.js';
export declare class IntentClassifier {
    classify(query: string, options?: {
        projectId?: string;
    }): {
        intentType: IntentType;
        entityHint?: string;
        temporalHint?: string;
        confidence: number;
    };
    private isCrossDomainQuery;
    private extractTemporalHint;
    private extractEntityHint;
}
//# sourceMappingURL=IntentClassifier.d.ts.map