import { ToolResultSanitizer } from './ToolResultSanitizer.js';
export class ToolEvidencePack {
    items = [];
    add(item) {
        this.items.push(item);
        this.deduplicate();
    }
    deduplicate() {
        const seenFacts = new Set();
        const seenEvents = new Set();
        const seenNeurons = new Set();
        for (const item of this.items) {
            item.facts = item.facts.filter((fact) => unique(seenFacts, fact.factId));
            item.events = item.events.filter((event) => unique(seenEvents, event.eventId));
            item.neurons = item.neurons.filter((neuron) => unique(seenNeurons, neuron.neuronId));
        }
    }
    totalTokens() {
        return this.items.reduce((sum, item) => sum + item.estimatedTokens, 0);
    }
    toPromptSummary(limit) {
        const sanitizer = new ToolResultSanitizer();
        const selected = this.items
            .slice()
            .sort((a, b) => b.relevanceScore - a.relevanceScore || a.addedAt - b.addedAt);
        const lines = [];
        let used = 0;
        for (const item of selected) {
            if (used >= limit)
                break;
            const remaining = limit - used;
            const summary = summarizeItem(item, remaining);
            used += estimateTokens(summary);
            lines.push(summary);
        }
        return sanitizer.wrapForPrompt(lines.join('\n\n') || '（无工具追加证据）');
    }
}
function unique(seen, key) {
    if (!key)
        return true;
    if (seen.has(key))
        return false;
    seen.add(key);
    return true;
}
function summarizeItem(item, tokenLimit) {
    const facts = item.facts.slice(0, 12).map((fact) => ({
        factId: fact.factId,
        subject: fact.subject,
        predicateFamily: fact.predicateFamily,
        predicateValue: fact.predicateValue,
        object: fact.object,
        confidence: fact.confidence,
    }));
    const events = item.events.slice(0, 8).map((event) => ({
        eventId: event.eventId,
        eventType: event.eventType,
        actor: event.actor,
        target: event.target,
        confidence: event.confidence,
    }));
    const neurons = item.neurons.slice(0, 6).map((neuron) => ({
        neuronId: neuron.neuronId,
        contentPreview: neuron.contentPreview,
        type: neuron.type,
        tags: neuron.tags,
    }));
    const text = JSON.stringify({
        toolCallId: item.toolCallId,
        toolName: item.toolName,
        query: item.query,
        facts,
        events,
        neurons,
        entityIds: item.entityIds,
        sanitized: item.sanitized,
        injectionRiskDetected: item.injectionRiskDetected,
    });
    return text.slice(0, Math.max(80, tokenLimit * 4));
}
export function estimateTokens(text) {
    return Math.ceil(text.length / 4);
}
