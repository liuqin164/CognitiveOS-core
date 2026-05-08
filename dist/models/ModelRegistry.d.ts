import type { EmbedFn, ModelRegistryConfig, ModelRoleConfig, ModelRoleName, TextGenerateFn } from './ModelRole.js';
export declare class ModelRegistry {
    private config;
    constructor(config: ModelRegistryConfig);
    static defaultConfig(): ModelRegistryConfig;
    static defaults(): ModelRegistry;
    getTextGenerator(role: 'memory' | 'reasoning'): TextGenerateFn;
    getRoleConfig(role: ModelRoleName): ModelRoleConfig;
    getEmbedder(): EmbedFn;
    isRuleOnly(role: 'memory' | 'reasoning'): boolean;
    private generateText;
    private runFallback;
    private resolveTextProvider;
}
//# sourceMappingURL=ModelRegistry.d.ts.map