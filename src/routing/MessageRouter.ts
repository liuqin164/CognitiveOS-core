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

export class MessageRouter {
  constructor(
    private readonly classifier: SystemIntentClassifier,
    private readonly managers: ManagerRegistryLike,
    private readonly formatter: DirectReplyFormatter
  ) {}

  async route(message: string): Promise<RouteResult> {
    const startedAt = Date.now();
    const classification = this.classifier.classify(message);

    if (classification.intent === 'reasoning_required') {
      return {
        path: 'slow',
        intent: 'reasoning_required',
        reply: '',
        latencyMs: Date.now() - startedAt
      };
    }

    const data = await this.managers.dispatch(
      classification.intent,
      this.buildParams(classification.intent, message, classification.matchedPattern)
    );

    return {
      path: 'fast',
      intent: classification.intent,
      reply: data === null ? '（该功能暂不可用）' : this.formatter.format(classification.intent, data),
      latencyMs: Date.now() - startedAt
    };
  }

  private buildParams(
    intent: Exclude<SystemIntent, 'reasoning_required'>,
    message: string,
    matchedPattern?: string
  ): Record<string, unknown> | undefined {
    switch (intent) {
      case 'system_query.memory_search':
        return { q: message.trim() };
      case 'system_query.memory_recent':
        return { limit: 10 };
      case 'system_query.trace':
        return { limit: 5 };
      case 'system_command.approve':
      case 'system_command.reject':
      case 'system_command.cancel_task': {
        const extractedId = this.extractIdentifier(message, matchedPattern);
        return extractedId ? { id: extractedId } : undefined;
      }
      default:
        return undefined;
    }
  }

  private extractIdentifier(message: string, matchedPattern?: string): string | undefined {
    const confirmationMatch = matchedPattern?.match(/^confirmation:(?:approve|reject):(.+)$/);
    if (confirmationMatch?.[1]) {
      return confirmationMatch[1];
    }

    const idMatch = message.match(/\b([A-Za-z0-9][A-Za-z0-9_-]{2,})\b/g);
    if (!idMatch || idMatch.length === 0) {
      return undefined;
    }

    return idMatch[idMatch.length - 1];
  }
}
