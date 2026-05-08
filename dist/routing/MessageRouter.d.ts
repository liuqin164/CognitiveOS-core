import type { ManagerRegistryLike } from '../types/ExtensionPoints.js';
import { DirectReplyFormatter } from './DirectReplyFormatter.js';
import type { SystemIntent } from './SystemIntentClassifier.js';
import { SystemIntentClassifier } from './SystemIntentClassifier.js';
export interface RouteResult {
    path: 'fast' | 'slow';
    intent: SystemIntent;
    reply: string;
    latencyMs: number;
}
export declare class MessageRouter {
    private readonly classifier;
    private readonly managers;
    private readonly formatter;
    constructor(classifier: SystemIntentClassifier, managers: ManagerRegistryLike, formatter: DirectReplyFormatter);
    route(message: string): Promise<RouteResult>;
    private buildParams;
    private extractIdentifier;
}
//# sourceMappingURL=MessageRouter.d.ts.map