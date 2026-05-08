import type { SystemIntent } from './SystemIntentClassifier.js';
export declare const SYSTEM_INTENT_PRIORITY: readonly SystemIntent[];
export declare const SYSTEM_INTENT_PATTERNS: Readonly<Record<SystemIntent, readonly RegExp[]>>;
export interface IntentPatternMatch {
    intent: SystemIntent;
    pattern: RegExp;
}
export declare class IntentPatternMatcher {
    readonly patterns: Readonly<Record<SystemIntent, readonly RegExp[]>>;
    match(message: string): IntentPatternMatch | null;
}
//# sourceMappingURL=IntentPatternMatcher.d.ts.map