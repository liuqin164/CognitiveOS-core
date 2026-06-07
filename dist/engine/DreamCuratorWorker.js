import { createHash } from 'crypto';
import { isOperationalNoiseText } from '../recall/RecallGovernance.js';
const PREFERENCE_PATTERN = /(请以后|以后请|始终|总是|偏好|喜欢|希望|不要|别|必须|一定要|长期目标|目标是|约束|边界|本地优先|local-first|prefer|preference|always|never|must|do not|don't|goal|constraint|boundary)/iu;
const CORRECTION_PATTERN = /(不对|不是|纠正|更正|应该是|推翻|修正|actually|correction|instead)/iu;
export class DreamCuratorWorker {
    deps;
    constructor(deps) {
        this.deps = deps;
    }
    async run(options = {}) {
        const before = this.deps.dreamLedgerStore.getStatus(options.projectId);
        const events = this.deps.eventStore.listRawEventsAfterGlobalSeq({
            projectId: options.projectId,
            afterGlobalSeq: before.lastDreamedGlobalSeq,
            limit: options.limit ?? 100,
        });
        if (events.length === 0) {
            return {
                projectId: options.projectId,
                skipped: true,
                reason: 'no_undreamed_raw_events',
                processedEventCount: 0,
                dreamableEventCount: 0,
                candidateCount: 0,
                status: before,
                candidates: [],
            };
        }
        const now = options.now ?? Date.now();
        const maxGlobalSeq = Math.max(...events.map((event) => event.globalSeq || 0));
        const dreamableEvents = events.filter((event) => this.isDreamableEvent(event));
        const candidateInputs = this.buildCandidates(dreamableEvents, options, now);
        const run = this.deps.candidateStore.insertRun({
            projectId: options.projectId,
            sessionId: this.singleSessionId(dreamableEvents),
            sourceNeuronIds: [],
            mode: `dream_curator_${options.mode ?? 'candidate'}_v1`,
            promptHash: hash(JSON.stringify(events.map((event) => ({
                eventId: event.eventId,
                globalSeq: event.globalSeq,
                contentHash: event.contentHash,
            })))),
            outputHash: hash(JSON.stringify(candidateInputs.map((candidate) => ({
                candidateType: candidate.candidateType,
                content: candidate.content,
                evidence: candidate.evidence,
            })))),
            status: 'succeeded',
            createdAt: now,
        });
        const inserted = this.deps.candidateStore.insertCandidates(candidateInputs.map((candidate) => ({ ...candidate, runId: run.runId, createdAt: now })));
        const status = this.deps.dreamLedgerStore.markDreamed(options.projectId, maxGlobalSeq, now);
        return {
            runId: run.runId,
            projectId: options.projectId,
            skipped: false,
            processedEventCount: events.length,
            dreamableEventCount: dreamableEvents.length,
            candidateCount: inserted.length,
            maxGlobalSeq,
            status,
            candidates: inserted,
        };
    }
    buildCandidates(events, options, now) {
        if (events.length === 0)
            return [];
        const status = options.mode === 'shadow' ? 'shadow' : 'candidate';
        const candidates = [];
        const userEvents = events.filter((event) => event.role === 'user');
        if (userEvents.length > 0) {
            candidates.push({
                candidateType: 'summary',
                status,
                confidence: 0.74,
                content: {
                    projectId: options.projectId,
                    sessionId: this.singleSessionId(events),
                    scope: this.singleSessionId(events) ? 'session' : 'turn_window',
                    summary: summarizeEvents(events),
                    topics: extractTopics(events.map(eventText).join('\n')),
                    source: 'mixed_user_assistant_raw_ledger',
                    durability: 'session',
                    risk: 'curator_summary_candidate_requires_governance',
                    windowStart: Math.min(...events.map((event) => event.occurredAt)),
                    windowEnd: Math.max(...events.map((event) => event.occurredAt)),
                },
                evidence: events.map((event) => this.toEvidence(event)),
                createdAt: now,
            });
        }
        for (const event of userEvents) {
            const text = eventText(event);
            if (PREFERENCE_PATTERN.test(text)) {
                candidates.push({
                    candidateType: 'preferences',
                    status,
                    confidence: 0.8,
                    content: {
                        projectId: event.projectId || options.projectId,
                        subject: 'user',
                        predicate: preferencePredicate(text),
                        object: text,
                        statement: text,
                        category: preferenceCategory(text),
                        tags: preferenceTags(text),
                        source: 'explicit_user_statement',
                        durability: 'durable',
                        risk: 'curator_preference_candidate_requires_governance',
                    },
                    evidence: [this.toEvidence(event)],
                    createdAt: now,
                });
            }
            if (CORRECTION_PATTERN.test(text)) {
                candidates.push({
                    candidateType: 'contradictions',
                    status,
                    confidence: 0.72,
                    content: {
                        projectId: event.projectId || options.projectId,
                        statement: text,
                        source: 'explicit_user_statement',
                        durability: 'event',
                        risk: 'correction_candidate_requires_review',
                    },
                    evidence: [this.toEvidence(event)],
                    createdAt: now,
                });
            }
        }
        for (const event of events) {
            if (event.rawEventType === 'tool_result' && event.parentEventId) {
                candidates.push({
                    candidateType: 'causalLinks',
                    status,
                    confidence: 0.68,
                    content: {
                        projectId: event.projectId || options.projectId,
                        relation: 'tool_result_for',
                        causeEventId: event.parentEventId,
                        effectEventId: event.eventId,
                        statement: eventText(event),
                        source: 'tool_observation_candidate',
                        risk: 'tool_observation_requires_governance',
                    },
                    evidence: [this.toEvidence(event)],
                    createdAt: now,
                });
            }
        }
        return candidates;
    }
    isDreamableEvent(event) {
        const text = eventText(event);
        if (!text.trim())
            return false;
        if (isOperationalNoiseText(text))
            return false;
        const metadata = event.payload && typeof event.payload === 'object'
            ? event.payload.metadata
            : undefined;
        if (metadata && Object.values(metadata).some((value) => isOperationalNoiseText(String(value || '')))) {
            return false;
        }
        return true;
    }
    toEvidence(event) {
        return {
            eventId: event.eventId,
            role: event.role,
            rawEventType: event.rawEventType,
            threadId: event.threadId,
            sessionId: event.sessionId,
            projectId: event.projectId,
            globalSeq: event.globalSeq,
            occurredAt: event.occurredAt,
            textExcerpt: truncate(eventText(event), 280),
            sourceAnchor: {
                eventId: event.eventId,
                threadId: event.threadId,
                sessionId: event.sessionId,
                turnId: event.turnId,
                role: event.role,
                threadSeq: event.threadSeq,
                turnSeq: event.turnSeq,
                eventOrdinal: event.eventOrdinal,
                parentEventId: event.parentEventId,
                prevEventId: event.prevEventId,
                nextEventId: event.nextEventId,
                causalityType: event.causalityType,
                orderingConfidence: event.orderingConfidence,
            },
        };
    }
    singleSessionId(events) {
        const sessionIds = new Set(events.map((event) => event.sessionId).filter((id) => Boolean(id)));
        return sessionIds.size === 1 ? [...sessionIds][0] : undefined;
    }
}
function eventText(event) {
    const payload = event.payload;
    if (typeof payload.text === 'string')
        return payload.text;
    if (typeof payload.output === 'string')
        return payload.output;
    if (typeof payload.title === 'string')
        return payload.title;
    return JSON.stringify(event.payload);
}
function summarizeEvents(events) {
    return events
        .slice(0, 12)
        .map((event) => `${event.role || event.rawEventType || 'event'}: ${truncate(eventText(event), 180)}`)
        .join('\n');
}
function preferencePredicate(text) {
    if (/不要|别|never|do not|don't|边界|boundary/iu.test(text))
        return 'constraint';
    if (/长期目标|目标是|goal/iu.test(text))
        return 'goal';
    if (/必须|一定要|本地优先|must|local-first/iu.test(text))
        return 'operating_constraint';
    return 'preference';
}
function preferenceCategory(text) {
    if (/不要|别|never|do not|don't|边界|boundary/iu.test(text))
        return 'project_constraint';
    if (/长期目标|目标是|goal/iu.test(text))
        return 'long_term_goal';
    if (/必须|一定要|本地优先|must|local-first/iu.test(text))
        return 'operating_preference';
    return 'user_preference';
}
function preferenceTags(text) {
    const tags = ['source:explicit_user_statement'];
    if (/记忆内核|CogMem|CognitiveOS|OpenClaw|Hermes|Obsidian|wiki/iu.test(text))
        tags.push('scope:project');
    if (/本地优先|local-first/iu.test(text))
        tags.push('policy:local_first');
    if (/不要|别|never|do not|don't/iu.test(text))
        tags.push('kind:negative_constraint');
    if (/长期目标|目标是|goal/iu.test(text))
        tags.push('kind:goal');
    return tags;
}
function extractTopics(text) {
    const topics = [];
    for (const topic of ['CogMem', 'CognitiveOS', 'OpenClaw', 'Hermes', 'Obsidian', 'wiki', '记忆内核', '记忆黑盒', 'local-first']) {
        if (text.toLowerCase().includes(topic.toLowerCase()))
            topics.push(topic);
    }
    return [...new Set(topics)];
}
function truncate(value, maxLength) {
    return value.length <= maxLength ? value : `${value.slice(0, maxLength)}...`;
}
function hash(value) {
    return createHash('sha256').update(value).digest('hex');
}
