export class MessageRouter {
    classifier;
    managers;
    formatter;
    constructor(classifier, managers, formatter) {
        this.classifier = classifier;
        this.managers = managers;
        this.formatter = formatter;
    }
    async route(message) {
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
        const data = await this.managers.dispatch(classification.intent, this.buildParams(classification.intent, message, classification.matchedPattern));
        return {
            path: 'fast',
            intent: classification.intent,
            reply: data === null ? '（该功能暂不可用）' : this.formatter.format(classification.intent, data),
            latencyMs: Date.now() - startedAt
        };
    }
    buildParams(intent, message, matchedPattern) {
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
    extractIdentifier(message, matchedPattern) {
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
