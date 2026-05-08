const FAST_PATH_HIT_RATE_BASELINE = 0.375;
const FAST_PATH_MIN_WINDOW = 8;
const LLM_FALLBACK_THRESHOLD = 5;
const CAPABILITY_FAILURE_RATE_THRESHOLD = 0.3;
const KNOWN_BASELINE_METRICS = {
    brain_vs_dump_token_ratio: { value: 0.05, mode: 'max' },
    brain_stale_leakage: { value: 0.0, mode: 'exact' },
    resume_success_rate: { value: 1.0, mode: 'exact' },
    hit_rate: { value: 0.375, mode: 'min' },
    misclassification_rate: { value: 0.0, mode: 'exact' },
    cross_workspace_leakage_rate: { value: 0.0, mode: 'exact' },
    stream_p99_ms: { value: 100, mode: 'max' },
    delivery_rate: { value: 1.0, mode: 'exact' },
    continuity_rate: { value: 1.0, mode: 'exact' }
};
/**
 * @public experimental
 */
export class MetaObservationCollector {
    traceStore;
    constructor(traceStore) {
        this.traceStore = traceStore;
    }
    collect(options = {}) {
        const patterns = this.collectPatterns(options);
        this.persistPatterns(patterns);
        return patterns;
    }
    collectPatterns(options = {}) {
        const windowMs = options.windowMs ?? 7 * 24 * 60 * 60 * 1000;
        const minOccurrences = options.minOccurrences ?? 3;
        const minTimestamp = Date.now() - windowMs;
        const patterns = [];
        const approvalEvents = this.traceStore
            .queryByEventType('approval.request')
            .filter((event) => event.timestamp >= minTimestamp);
        patterns.push(...this.collectByCapability(approvalEvents, minOccurrences));
        const filterEvents = this.traceStore
            .queryByEventType('observation_filter.decision')
            .filter((event) => event.timestamp >= minTimestamp);
        patterns.push(...this.collectByUrl(filterEvents, minOccurrences));
        const promoteEvents = this.traceStore
            .queryByEventType('memory.promote')
            .filter((event) => event.timestamp >= minTimestamp);
        patterns.push(...this.collectByFact(promoteEvents, minOccurrences, 'flip_flop_supersede'));
        patterns.push(...this.collectByFact(promoteEvents, minOccurrences, 'repeated_decay_after_promote'));
        const fastPathMissEvents = this.traceStore
            .queryByEventType('fast_path.miss')
            .filter((event) => event.timestamp >= minTimestamp);
        const fastPathPattern = this.collectFastPathMissPattern(fastPathMissEvents);
        if (fastPathPattern) {
            patterns.push(fastPathPattern);
        }
        const llmInvokeEvents = this.traceStore
            .queryByEventType('llm.invoke')
            .filter((event) => event.timestamp >= minTimestamp);
        const llmPattern = this.collectLlmFallbackPattern(llmInvokeEvents);
        if (llmPattern) {
            patterns.push(llmPattern);
        }
        const capabilityResultEvents = this.traceStore
            .queryByEventType('capability.result')
            .filter((event) => event.timestamp >= minTimestamp);
        patterns.push(...this.collectCapabilityFailures(capabilityResultEvents));
        const topicReclassifiedEvents = this.traceStore
            .queryByEventType('memory.topic_reclassified')
            .filter((event) => event.timestamp >= minTimestamp);
        patterns.push(...this.collectTopicReclassifications(topicReclassifiedEvents));
        return patterns;
    }
    collectFromBenchmarkResults(results) {
        const patterns = [];
        for (const result of results) {
            const metrics = result.suiteResult.metrics ?? {};
            for (const [metricName, baseline] of Object.entries(KNOWN_BASELINE_METRICS)) {
                const currentValue = metrics[metricName];
                if (typeof currentValue !== 'number' || this.metricPasses(currentValue, baseline.value, baseline.mode)) {
                    continue;
                }
                patterns.push({
                    type: 'benchmark_regression',
                    metricName,
                    currentValue,
                    baselineValue: baseline.value,
                    occurrenceCount: 1,
                    evidenceEventIds: []
                });
            }
        }
        this.persistPatterns(patterns);
        return patterns;
    }
    listRecentObservationCounts(windowMs = 24 * 60 * 60 * 1000) {
        this.ensureObservationSchema();
        const minTimestamp = Date.now() - windowMs;
        const rows = this.getDatabase().prepare(`
      SELECT type, COUNT(*) AS count
      FROM meta_observations
      WHERE observed_at >= ?
      GROUP BY type
      ORDER BY count DESC, type ASC
    `).all(minTimestamp);
        return rows.map((row) => ({
            type: row.type,
            count: row.count
        }));
    }
    collectByCapability(events, minOccurrences) {
        const grouped = new Map();
        for (const event of events) {
            const capabilityId = typeof event.payload.capabilityId === 'string' ? event.payload.capabilityId : undefined;
            if (!capabilityId)
                continue;
            grouped.set(capabilityId, [...(grouped.get(capabilityId) ?? []), event]);
        }
        return Array.from(grouped.entries())
            .filter(([, groupedEvents]) => groupedEvents.length >= minOccurrences)
            .map(([capabilityId, groupedEvents]) => ({
            type: 'repeated_approval_reject',
            capabilityId,
            occurrenceCount: groupedEvents.length,
            evidenceEventIds: groupedEvents.map((event) => event.id)
        }));
    }
    collectByUrl(events, minOccurrences) {
        const grouped = new Map();
        for (const event of events) {
            const url = typeof event.payload.url === 'string' ? event.payload.url : undefined;
            const shouldIngest = event.payload.shouldIngest;
            if (!url || shouldIngest !== false)
                continue;
            grouped.set(url, [...(grouped.get(url) ?? []), event]);
        }
        return Array.from(grouped.entries())
            .filter(([, groupedEvents]) => groupedEvents.length >= minOccurrences)
            .map(([url, groupedEvents]) => ({
            type: 'repeated_url_filter',
            url,
            occurrenceCount: groupedEvents.length,
            evidenceEventIds: groupedEvents.map((event) => event.id)
        }));
    }
    collectByFact(events, minOccurrences, type) {
        const grouped = new Map();
        for (const event of events) {
            const factId = typeof event.payload.factId === 'string' ? event.payload.factId : undefined;
            if (!factId)
                continue;
            grouped.set(factId, [...(grouped.get(factId) ?? []), event]);
        }
        return Array.from(grouped.entries())
            .filter(([, groupedEvents]) => groupedEvents.length >= minOccurrences)
            .map(([factId, groupedEvents]) => ({
            type,
            factId,
            occurrenceCount: groupedEvents.length,
            evidenceEventIds: groupedEvents.map((event) => event.id)
        }));
    }
    collectFastPathMissPattern(events) {
        if (events.length === 0) {
            return null;
        }
        let totalDecisions = 0;
        let missCount = 0;
        const evidenceEventIds = [];
        for (const event of events) {
            const sample = this.resolveFastPathSample(event);
            if (!sample) {
                continue;
            }
            totalDecisions += sample.total;
            missCount += sample.misses;
            evidenceEventIds.push(event.id);
        }
        if (totalDecisions < FAST_PATH_MIN_WINDOW) {
            return null;
        }
        const hitRate = 1 - (missCount / totalDecisions);
        if (hitRate >= FAST_PATH_HIT_RATE_BASELINE) {
            return null;
        }
        return {
            type: 'fast_path_miss_pattern',
            occurrenceCount: evidenceEventIds.length,
            evidenceEventIds
        };
    }
    collectLlmFallbackPattern(events) {
        if (events.length < LLM_FALLBACK_THRESHOLD) {
            return null;
        }
        return {
            type: 'llm_fallback_pattern',
            occurrenceCount: events.length,
            evidenceEventIds: events.map((event) => event.id)
        };
    }
    collectCapabilityFailures(events) {
        const grouped = new Map();
        for (const event of events) {
            const capabilityId = typeof event.payload.capabilityId === 'string' ? event.payload.capabilityId : undefined;
            if (!capabilityId) {
                continue;
            }
            grouped.set(capabilityId, [...(grouped.get(capabilityId) ?? []), event]);
        }
        return Array.from(grouped.entries()).flatMap(([capabilityId, groupedEvents]) => {
            const failedEvents = groupedEvents.filter((event) => event.payload.success === false);
            const failureRate = groupedEvents.length === 0 ? 0 : failedEvents.length / groupedEvents.length;
            if (failureRate <= CAPABILITY_FAILURE_RATE_THRESHOLD || failedEvents.length === 0) {
                return [];
            }
            return [{
                    type: 'capability_failure_pattern',
                    capabilityId,
                    occurrenceCount: failedEvents.length,
                    failureRate,
                    evidenceEventIds: failedEvents.map((event) => event.id)
                }];
        });
    }
    collectTopicReclassifications(events) {
        return events.flatMap((event) => {
            const neuronId = typeof event.payload.neuronId === 'string' ? event.payload.neuronId : undefined;
            if (!neuronId)
                return [];
            return [{
                    type: 'TopicReclassified',
                    neuronId,
                    projectId: typeof event.payload.projectId === 'string' ? event.payload.projectId : event.projectId,
                    from: typeof event.payload.from === 'string' ? event.payload.from : undefined,
                    to: typeof event.payload.to === 'string' ? event.payload.to : undefined,
                    content: typeof event.payload.content === 'string' ? event.payload.content : '',
                    occurrenceCount: 1,
                    evidenceEventIds: [event.id]
                }];
        });
    }
    resolveFastPathSample(event) {
        const hitRate = typeof event.payload.hitRate === 'number' ? event.payload.hitRate : undefined;
        const windowSize = typeof event.payload.windowSize === 'number' ? event.payload.windowSize : undefined;
        const missCount = typeof event.payload.missCount === 'number' ? event.payload.missCount : undefined;
        const totalDecisions = typeof event.payload.totalDecisions === 'number' ? event.payload.totalDecisions : windowSize;
        if (typeof hitRate === 'number' && typeof totalDecisions === 'number' && totalDecisions > 0) {
            return {
                misses: Math.max(0, totalDecisions * (1 - hitRate)),
                total: totalDecisions
            };
        }
        if (typeof missCount === 'number' && typeof totalDecisions === 'number' && totalDecisions > 0) {
            return {
                misses: missCount,
                total: totalDecisions
            };
        }
        if (event.payload.missed === true) {
            return { misses: 1, total: 1 };
        }
        return null;
    }
    metricPasses(value, baselineValue, mode) {
        switch (mode) {
            case 'max':
                return value <= baselineValue;
            case 'min':
                return value >= baselineValue;
            case 'exact':
                return Math.abs(value - baselineValue) < 0.000001;
        }
    }
    persistPatterns(patterns) {
        if (patterns.length === 0) {
            return;
        }
        this.ensureObservationSchema();
        const statement = this.getDatabase().prepare(`
      INSERT INTO meta_observations (
        id,
        observed_at,
        type,
        status,
        capability_id,
        url,
        fact_id,
        neuron_id,
        project_id,
        from_topic_path,
        to_topic_path,
        content,
        metric_name,
        current_value,
        baseline_value,
        failure_rate,
        occurrence_count,
        evidence_event_ids
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
        for (const pattern of patterns) {
            statement.run(crypto.randomUUID(), Date.now(), pattern.type, 'draft', pattern.capabilityId ?? null, pattern.url ?? null, pattern.factId ?? null, pattern.neuronId ?? null, pattern.projectId ?? null, pattern.from ?? null, pattern.to ?? null, pattern.content ?? null, pattern.metricName ?? null, pattern.currentValue ?? null, pattern.baselineValue ?? null, pattern.failureRate ?? null, pattern.occurrenceCount, JSON.stringify(pattern.evidenceEventIds));
        }
    }
    ensureObservationSchema() {
        this.getDatabase().exec(`
      CREATE TABLE IF NOT EXISTS meta_observations (
        id TEXT PRIMARY KEY,
        observed_at INTEGER NOT NULL,
        type TEXT NOT NULL,
        status TEXT NOT NULL,
        capability_id TEXT,
        url TEXT,
        fact_id TEXT,
        neuron_id TEXT,
        project_id TEXT,
        from_topic_path TEXT,
        to_topic_path TEXT,
        content TEXT,
        metric_name TEXT,
        current_value REAL,
        baseline_value REAL,
        failure_rate REAL,
        occurrence_count INTEGER NOT NULL,
        evidence_event_ids TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_meta_observations_type_observed
        ON meta_observations(type, observed_at DESC);

      CREATE INDEX IF NOT EXISTS idx_meta_observations_status_observed
        ON meta_observations(status, observed_at DESC);
    `);
        this.ensureObservationColumn('neuron_id', 'TEXT');
        this.ensureObservationColumn('project_id', 'TEXT');
        this.ensureObservationColumn('from_topic_path', 'TEXT');
        this.ensureObservationColumn('to_topic_path', 'TEXT');
        this.ensureObservationColumn('content', 'TEXT');
    }
    ensureObservationColumn(name, type) {
        const columns = this.getDatabase().prepare(`PRAGMA table_info(meta_observations)`).all();
        if (columns.some((column) => column.name === name)) {
            return;
        }
        this.getDatabase().exec(`ALTER TABLE meta_observations ADD COLUMN ${name} ${type}`);
    }
    getDatabase() {
        return this.traceStore.db;
    }
}
