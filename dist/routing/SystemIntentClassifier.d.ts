import { ConfirmationPhraseMatcher } from './ConfirmationPhraseMatcher.js';
import { IntentPatternMatcher } from './IntentPatternMatcher.js';
export type SystemIntent = 'system_query.tasks' | 'system_query.approvals' | 'system_query.contradictions' | 'system_query.capabilities' | 'system_query.environment' | 'system_query.self_manifest' | 'system_query.models' | 'system_query.file_assets' | 'system_query.memory_recent' | 'system_query.memory_search' | 'system_query.important_memories' | 'system_query.context' | 'system_query.trace' | 'system_command.approve' | 'system_command.reject' | 'system_command.resume' | 'system_command.cancel_task' | 'system_command.mark_important' | 'system_command.mark_permanent' | 'system_command.unmark_important' | 'system_confirmation.yes_no' | 'reasoning_required';
export interface IntentClassificationResult {
    intent: SystemIntent;
    confidence: number;
    matchedPattern?: string;
}
export declare class SystemIntentClassifier {
    private readonly patternMatcher;
    private readonly confirmationPhraseMatcher;
    constructor(patternMatcher?: IntentPatternMatcher, confirmationPhraseMatcher?: ConfirmationPhraseMatcher);
    classify(message: string): IntentClassificationResult;
}
//# sourceMappingURL=SystemIntentClassifier.d.ts.map