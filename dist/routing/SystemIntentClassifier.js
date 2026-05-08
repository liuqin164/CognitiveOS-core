import { ConfirmationPhraseMatcher } from './ConfirmationPhraseMatcher.js';
import { IntentPatternMatcher } from './IntentPatternMatcher.js';
export class SystemIntentClassifier {
    patternMatcher;
    confirmationPhraseMatcher;
    constructor(patternMatcher = new IntentPatternMatcher(), confirmationPhraseMatcher = new ConfirmationPhraseMatcher()) {
        this.patternMatcher = patternMatcher;
        this.confirmationPhraseMatcher = confirmationPhraseMatcher;
    }
    classify(message) {
        const normalizedMessage = message.trim();
        if (!normalizedMessage) {
            return { intent: 'reasoning_required', confidence: 1.0 };
        }
        const match = this.patternMatcher.match(normalizedMessage);
        if (match) {
            const confirmation = this.confirmationPhraseMatcher.matchConfirmation(normalizedMessage);
            if (confirmation && (match.intent === 'system_command.approve' || match.intent === 'system_command.reject')) {
                return {
                    intent: match.intent,
                    confidence: 1.0,
                    matchedPattern: confirmation.subject
                        ? `confirmation:${confirmation.action}:${confirmation.subject}`
                        : `confirmation:${confirmation.action}`
                };
            }
            return {
                intent: match.intent,
                confidence: 1.0,
                matchedPattern: match.pattern.source
            };
        }
        const confirmation = this.confirmationPhraseMatcher.matchConfirmation(normalizedMessage);
        if (confirmation?.action === 'approve') {
            return {
                intent: 'system_command.approve',
                confidence: 1.0,
                matchedPattern: confirmation.subject ? `confirmation:approve:${confirmation.subject}` : 'confirmation:approve'
            };
        }
        if (confirmation?.action === 'reject') {
            return {
                intent: 'system_command.reject',
                confidence: 1.0,
                matchedPattern: confirmation.subject ? `confirmation:reject:${confirmation.subject}` : 'confirmation:reject'
            };
        }
        return { intent: 'reasoning_required', confidence: 1.0 };
    }
}
