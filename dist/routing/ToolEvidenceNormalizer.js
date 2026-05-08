import { estimateTokens } from './ToolEvidencePack.js';
export class ToolEvidenceNormalizer {
    normalize(input) {
        const payload = objectPayload(input.sanitizedResult);
        const facts = factArray(payload.facts);
        const events = eventArray(payload.events);
        const neurons = neuronSummaries(payload);
        const entityIds = entityIdsFor(input.call, payload, facts);
        const beliefs = beliefArray(payload.beliefs);
        const query = input.call.query ?? input.call.neuron_id ?? input.call.entity_name ?? '';
        const relevanceScore = computeRelevance(query, facts, events, neurons, beliefs);
        return {
            toolCallId: input.toolResult.callId,
            toolName: input.toolResult.toolName,
            query,
            facts,
            events,
            neurons,
            entityIds,
            beliefs,
            relevanceScore,
            estimatedTokens: estimateTokens(JSON.stringify({ facts, events, neurons, entityIds, beliefs })),
            addedAt: Date.now(),
            projectId: input.projectId,
            sanitized: true,
            injectionRiskDetected: input.injectionRiskDetected ?? false,
        };
    }
}
function objectPayload(value) {
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}
function factArray(value) {
    return Array.isArray(value) ? value : [];
}
function eventArray(value) {
    return Array.isArray(value) ? value : [];
}
function beliefArray(value) {
    return Array.isArray(value) ? value : [];
}
function neuronSummaries(payload) {
    const summaries = [];
    const neuron = objectPayload(payload.neuron);
    if (typeof neuron.neuronId === 'string') {
        summaries.push({
            neuronId: neuron.neuronId,
            contentPreview: String(neuron.content ?? '').slice(0, 500),
            tags: Array.isArray(neuron.tags) ? neuron.tags.filter((tag) => typeof tag === 'string') : [],
            type: typeof neuron.type === 'string' ? neuron.type : 'unknown',
            createdAt: typeof neuron.createdAt === 'number' ? neuron.createdAt : undefined,
            projectId: typeof neuron.projectId === 'string' ? neuron.projectId : undefined,
        });
    }
    const neighbors = Array.isArray(payload.neighbors) ? payload.neighbors : [];
    for (const raw of neighbors) {
        const n = objectPayload(raw);
        if (typeof n.neuronId !== 'string')
            continue;
        summaries.push({
            neuronId: n.neuronId,
            contentPreview: String(n.content ?? '').slice(0, 300),
            tags: Array.isArray(n.tags) ? n.tags.filter((tag) => typeof tag === 'string') : [],
            type: typeof n.type === 'string' ? n.type : 'unknown',
            projectId: typeof n.projectId === 'string' ? n.projectId : undefined,
        });
    }
    return summaries;
}
function entityIdsFor(call, payload, facts) {
    const ids = new Set();
    if (typeof payload.entityId === 'string')
        ids.add(payload.entityId);
    if (call.entity_name && typeof payload.entityId === 'string')
        ids.add(payload.entityId);
    for (const fact of facts) {
        if (fact.entityId)
            ids.add(fact.entityId);
    }
    return Array.from(ids);
}
function computeRelevance(query, facts, events, neurons, beliefs) {
    const q = query.toLowerCase();
    if (!q)
        return 0.5;
    const haystacks = [
        ...facts.map((f) => `${f.subject} ${f.predicateFamily} ${f.predicateValue ?? ''} ${f.object ?? ''}`),
        ...events.map((e) => `${e.eventType} ${e.actor ?? ''} ${e.target ?? ''}`),
        ...neurons.map((n) => n.contentPreview),
        ...beliefs.map((b) => `${b.subject} ${b.predicate} ${b.objectValue.raw}`),
    ];
    if (haystacks.length === 0)
        return 0.1;
    const hits = haystacks.filter((text) => text.toLowerCase().includes(q)).length;
    return Math.max(0.2, Math.min(1, hits / haystacks.length + 0.4));
}
