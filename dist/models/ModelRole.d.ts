export type ModelRoleName = 'memory' | 'reasoning' | 'embedding';
export type ProviderType = 'openai_compatible' | 'anthropic' | 'rule_only' | 'deterministic_local';
export interface ModelRoleConfig {
    role: ModelRoleName;
    provider: ProviderType;
    baseUrl?: string;
    apiKey?: string;
    modelName: string;
    timeoutMs?: number;
    fallback?: ModelRoleName | 'rule_only' | 'deterministic_local';
}
export interface ModelRegistryConfig {
    memory: ModelRoleConfig;
    reasoning: ModelRoleConfig;
    embedding: ModelRoleConfig;
}
export type TextGenerateFn = (system: string, user: string) => Promise<string>;
export type EmbedFn = (text: string) => Promise<number[]>;
//# sourceMappingURL=ModelRole.d.ts.map