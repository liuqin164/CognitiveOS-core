import type { QueryTimePendingEntityResolverOutput, QueryTimePendingEntityResolverInput } from '../retrieval/QueryTimePendingEntityResolver.js';
export interface QueryTimePendingEntityResolutionHookOutput extends QueryTimePendingEntityResolverOutput {
    hookRan: boolean;
}
export interface QueryTimePendingEntityResolutionHook {
    resolve(input: QueryTimePendingEntityResolverInput): QueryTimePendingEntityResolutionHookOutput;
}
export declare class NoopQueryTimePendingEntityResolutionHook implements QueryTimePendingEntityResolutionHook {
    resolve(): QueryTimePendingEntityResolutionHookOutput;
}
//# sourceMappingURL=QueryTimePendingEntityResolution.d.ts.map