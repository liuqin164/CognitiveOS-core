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
        const candidateInputs = await this.buildCandidates(dreamableEvents, options, now);
        const providerConfig = this.resolveProviderConfig(options);
        const run = this.deps.candidateStore.insertRun({
            projectId: options.projectId,
            sessionId: this.singleSessionId(dreamableEvents),
            sourceNeuronIds: [],
            modelProvider: providerConfig.provider,
            modelName: providerConfig.modelName,
            mode: `dream_curator_${providerConfig.provider}_${options.mode ?? 'candidate'}_v1`,
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
    async buildCandidates(events, options, now) {
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
        const providerCandidates = await this.buildProviderCandidates(events, options, now, status);
        candidates.push(...providerCandidates);
        return candidates;
    }
    async buildProviderCandidates(events, options, now, status) {
        const generate = this.resolveGenerateText(options);
        if (!generate)
            return [];
        const systemPrompt = [
            'You are the CogMem Memory Curator / Dream Worker.',
            'You inspect raw chronological ledger events and propose memory governance candidates only.',
            'Do not rewrite verified facts. Do not promote anything to active memory.',
            'Do not expose hidden chain-of-thought. Return concise structured JSON only.',
            'Every candidate must be traceable to evidenceEventIds from the supplied raw ledger events.',
        ].join('\n');
        const userPrompt = JSON.stringify({
            task: 'Generate candidate-only memory curation output.',
            allowedCandidateBuckets: [
                'userPreferenceCandidates',
                'projectMemoryCandidates',
                'longTermGoalCandidates',
                'boundaryCandidates',
                'failureLessonCandidates',
                'diagnosticConclusionCandidates',
                'sessionSummaryCandidates',
                'topicSummaryCandidates',
                'temporalFactUpdateCandidates',
                'conflictCandidates',
            ],
            rawLedgerEvents: events.map((event) => ({
                eventId: event.eventId,
                role: event.role,
                rawEventType: event.rawEventType,
                threadId: event.threadId,
                sessionId: event.sessionId,
                projectId: event.projectId,
                globalSeq: event.globalSeq,
                occurredAt: event.occurredAt,
                text: truncate(eventText(event), 1200),
            })),
            outputContract: {
                format: 'strict JSON object',
                rule: 'LLM suggests candidates; CPU governance decides status later.',
                evidenceEventIds: 'array of raw event ids, or ["all"] only when the candidate is supported by the full window',
            },
        });
        let raw = '';
        try {
            raw = await generate(systemPrompt, userPrompt);
        }
        catch (error) {
            return [this.providerDiagnosticCandidate(events, now, 'dream_curator_provider_exception', error)];
        }
        const parsed = parseJsonObjectFromModel(raw);
        if (!parsed) {
            return [this.providerDiagnosticCandidate(events, now, 'dream_curator_provider_invalid_output', raw)];
        }
        return this.flattenProviderCandidates(parsed, events, now, status);
    }
    flattenProviderCandidates(parsed, events, now, status) {
        const buckets = [
            ['userPreferenceCandidates', 'user_preference', 'user_preference'],
            ['projectMemoryCandidates', 'project_memory', 'project_memory'],
            ['longTermGoalCandidates', 'long_term_goal', 'long_term_goal'],
            ['boundaryCandidates', 'boundary', 'boundary'],
            ['failureLessonCandidates', 'failure_lesson', 'failure_lesson'],
            ['diagnosticConclusionCandidates', 'diagnostic_conclusion', 'diagnostic_conclusion'],
            ['sessionSummaryCandidates', 'session_summary', 'session_summary'],
            ['topicSummaryCandidates', 'topic_summary', 'topic_summary'],
            ['temporalFactUpdateCandidates', 'temporal_fact_update', 'temporal_fact_update'],
            ['conflictCandidates', 'conflict_candidate', 'conflict_candidate'],
        ];
        const candidates = [];
        for (const [bucket, candidateType, promotionTargetType] of buckets) {
            const values = Array.isArray(parsed[bucket]) ? parsed[bucket] : [];
            for (const value of values) {
                if (!value || typeof value !== 'object')
                    continue;
                const record = value;
                const evidence = this.providerEvidenceFor(record, events);
                if (evidence.length === 0)
                    continue;
                candidates.push({
                    candidateType,
                    status,
                    confidence: clampConfidence(record.confidence, 0.68),
                    content: {
                        ...record,
                        source: 'llm_dream_curator_candidate',
                        governance: 'candidate_only_cpu_governance_required',
                        projectId: typeof record.projectId === 'string' ? record.projectId : events[0]?.projectId,
                        candidateBucket: bucket,
                    },
                    evidence,
                    promotionTargetType,
                    createdAt: now,
                });
            }
        }
        return candidates;
    }
    providerEvidenceFor(record, events) {
        const rawIds = Array.isArray(record.evidenceEventIds) ? record.evidenceEventIds : [];
        const ids = rawIds.map((id) => String(id)).filter(Boolean);
        const selected = ids.includes('all')
            ? events
            : events.filter((event) => ids.includes(event.eventId));
        const fallback = selected.length > 0 ? selected : events.slice(0, 4);
        return fallback.map((event) => this.toEvidence(event));
    }
    providerDiagnosticCandidate(events, now, reason, detail) {
        return {
            candidateType: 'diagnostic_conclusion',
            status: 'needs_confirmation',
            confidence: 0.4,
            content: {
                source: 'dream_curator_provider_warning',
                reason,
                detail: truncate(detail instanceof Error ? detail.message : String(detail || ''), 500),
                governance: 'candidate_only_cpu_governance_required',
                recommendation: 'Check [memory_model] provider configuration and rerun cogmem memory dream after fixing the model endpoint.',
            },
            evidence: events.slice(0, 4).map((event) => this.toEvidence(event)),
            promotionTargetType: 'diagnostic_conclusion',
            createdAt: now,
        };
    }
    resolveGenerateText(options) {
        if (options.generateText)
            return options.generateText;
        if (!this.deps.modelRegistry || this.deps.modelRegistry.isRuleOnly('memory'))
            return undefined;
        return this.deps.modelRegistry.getTextGenerator('memory');
    }
    resolveProviderConfig(options) {
        if (options.generateText)
            return { provider: 'explicit_generateText', modelName: 'custom' };
        if (!this.deps.modelRegistry)
            return { provider: 'rule_only' };
        const role = this.deps.modelRegistry.getRoleConfig('memory');
        return { provider: role.provider, modelName: role.modelName };
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
function parseJsonObjectFromModel(raw) {
    const text = String(raw || '').trim();
    if (!text)
        return null;
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]?.trim();
    const candidate = fenced || text;
    try {
        const parsed = JSON.parse(candidate);
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
            ? parsed
            : null;
    }
    catch {
        const start = candidate.indexOf('{');
        const end = candidate.lastIndexOf('}');
        if (start >= 0 && end > start) {
            try {
                const parsed = JSON.parse(candidate.slice(start, end + 1));
                return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
                    ? parsed
                    : null;
            }
            catch {
                return null;
            }
        }
        return null;
    }
}
function clampConfidence(value, fallback) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric))
        return fallback;
    return Math.max(0.05, Math.min(0.99, numeric));
}
