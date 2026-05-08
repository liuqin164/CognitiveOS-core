export type SemanticBackendMode = 'deterministic_local' | 'rule_only' | 'model_backed' | 'hybrid';
export type SemanticBackendProviderId = 'deterministic-local' | 'rule-only' | 'gemma4-e4b-local' | 'hybrid-rule-plus-gemma4-e4b';
export type SemanticBackendTask = 'offline_deep_consolidation' | 'async_low_confidence_enrichment' | 'optional_semantic_task';
export interface SemanticBackendConfig {
    mode: SemanticBackendMode;
    providerId: SemanticBackendProviderId;
    modelPath?: string;
    readinessFile: string;
    requireReady: boolean;
}
export interface SemanticBackendStatus {
    mode: SemanticBackendMode;
    providerId: SemanticBackendProviderId;
    ready: boolean;
    requiresExplicitSetup: boolean;
    modelPath?: string;
    readinessFile: string;
    eligibleTasks: SemanticBackendTask[];
    failureBehavior: 'no_effect' | 'rule_only_fallback' | 'explicit_failure';
    fallbackBackend: 'rule_only' | null;
    reason: string;
}
export interface SemanticBackendInvocation {
    task: SemanticBackendTask;
    selectedBackend: SemanticBackendProviderId | 'rule-only-fallback';
    fallbackUsed: boolean;
    ready: boolean;
    reason: string;
}
export declare function resolveSemanticBackendConfig(): SemanticBackendConfig;
export declare class SemanticBackendRuntime {
    private readonly config;
    constructor(config?: SemanticBackendConfig);
    getStatus(): SemanticBackendStatus;
    warmup(): SemanticBackendStatus;
    prepare(task: SemanticBackendTask): SemanticBackendInvocation;
    private isReady;
    private explainNotReady;
}
//# sourceMappingURL=SemanticBackend.d.ts.map