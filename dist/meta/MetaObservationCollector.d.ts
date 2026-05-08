import type { BenchmarkGroupResult } from '../benchmark/BenchmarkRunner.js';
import { TraceStore } from '../observability/TraceStore.js';
import type { ObservationPattern } from './types.js';
/**
 * @public experimental
 */
export declare class MetaObservationCollector {
    private traceStore;
    constructor(traceStore: TraceStore);
    collect(options?: {
        windowMs?: number;
        minOccurrences?: number;
    }): ObservationPattern[];
    collectPatterns(options?: {
        windowMs?: number;
        minOccurrences?: number;
    }): ObservationPattern[];
    collectFromBenchmarkResults(results: BenchmarkGroupResult[]): ObservationPattern[];
    listRecentObservationCounts(windowMs?: number): Array<{
        type: ObservationPattern['type'];
        count: number;
    }>;
    private collectByCapability;
    private collectByUrl;
    private collectByFact;
    private collectFastPathMissPattern;
    private collectLlmFallbackPattern;
    private collectCapabilityFailures;
    private collectTopicReclassifications;
    private resolveFastPathSample;
    private metricPasses;
    private persistPatterns;
    private ensureObservationSchema;
    private ensureObservationColumn;
    private getDatabase;
}
//# sourceMappingURL=MetaObservationCollector.d.ts.map