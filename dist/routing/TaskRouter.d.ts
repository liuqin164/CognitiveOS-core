import { IntentClassifier } from './IntentClassifier.js';
import type { TaskPlan } from './TaskPlan.js';
export declare class TaskRouter {
    private classifier;
    constructor(classifier?: IntentClassifier);
    plan(query: string, options?: {
        projectId?: string;
        confidenceThreshold?: number;
    }): TaskPlan;
    private createStep;
    private createClarifyStep;
}
//# sourceMappingURL=TaskRouter.d.ts.map