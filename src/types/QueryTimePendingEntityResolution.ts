import type {
  QueryTimePendingEntityResolverOutput,
  QueryTimePendingEntityResolverInput,
} from '../retrieval/QueryTimePendingEntityResolver.js';

export interface QueryTimePendingEntityResolutionHookOutput extends QueryTimePendingEntityResolverOutput {
  hookRan: boolean;
}

export interface QueryTimePendingEntityResolutionHook {
  resolve(input: QueryTimePendingEntityResolverInput): QueryTimePendingEntityResolutionHookOutput;
}

export class NoopQueryTimePendingEntityResolutionHook implements QueryTimePendingEntityResolutionHook {
  resolve(): QueryTimePendingEntityResolutionHookOutput {
    return {
      hookRan: false,
      overallStatus: 'not_applicable',
      overallReason: 'no_relative_pending_reference_in_query',
      resolvedEntityIds: [],
      candidateEntityIds: [],
      candidateNeuronIds: [],
      results: [],
      pendingCaptureMetrics: {
        pending_record_emitted_count: 0,
        pending_record_expected_but_missing_count: 0,
        pending_candidate_set_nonempty_count: 0,
        pending_candidate_set_empty_count: 0,
        referential_signal_preserved_count: 0,
        referential_signal_lost_count: 0,
        query_time_not_needed_due_to_write_time_sufficient_count: 0,
        query_time_not_needed_due_to_missing_pending_capture_count: 0
      }
    };
  }
}
