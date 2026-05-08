import { ConfirmationPhraseMatcher } from './ConfirmationPhraseMatcher.js';
import { IntentPatternMatcher } from './IntentPatternMatcher.js';

export type SystemIntent =
  | 'system_query.tasks'
  | 'system_query.approvals'
  | 'system_query.contradictions'
  | 'system_query.capabilities'
  | 'system_query.environment'
  | 'system_query.self_manifest'
  | 'system_query.models'
  | 'system_query.file_assets'
  | 'system_query.memory_recent'
  | 'system_query.memory_search'
  | 'system_query.important_memories'
  | 'system_query.context'
  | 'system_query.trace'
  | 'system_command.approve'
  | 'system_command.reject'
  | 'system_command.resume'
  | 'system_command.cancel_task'
  | 'system_command.mark_important'
  | 'system_command.mark_permanent'
  | 'system_command.unmark_important'
  | 'system_confirmation.yes_no'
  | 'reasoning_required';

export interface IntentClassificationResult {
  intent: SystemIntent;
  confidence: number;
  matchedPattern?: string;
}

export class SystemIntentClassifier {
  constructor(
    private readonly patternMatcher: IntentPatternMatcher = new IntentPatternMatcher(),
    private readonly confirmationPhraseMatcher: ConfirmationPhraseMatcher = new ConfirmationPhraseMatcher()
  ) {}

  classify(message: string): IntentClassificationResult {
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
