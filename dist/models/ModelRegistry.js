import { AnthropicClient } from './providers/AnthropicClient.js';
import { OpenAICompatibleClient } from './providers/OpenAICompatibleClient.js';
export class ModelRegistry {
    config;
    constructor(config) {
        this.config = config;
    }
    static defaultConfig() {
        return {
            memory: {
                role: 'memory',
                provider: 'rule_only',
                baseUrl: '',
                apiKey: '',
                modelName: 'rule_only',
                timeoutMs: 60000,
                fallback: 'rule_only'
            },
            reasoning: {
                role: 'reasoning',
                provider: 'rule_only',
                baseUrl: '',
                apiKey: '',
                modelName: 'rule_only',
                timeoutMs: 60000,
                fallback: 'memory'
            },
            embedding: {
                role: 'embedding',
                provider: 'deterministic_local',
                baseUrl: '',
                apiKey: '',
                modelName: 'deterministic_local',
                timeoutMs: 30000
            }
        };
    }
    static defaults() {
        return new ModelRegistry(ModelRegistry.defaultConfig());
    }
    getTextGenerator(role) {
        return async (system, user) => {
            return this.generateText(role, system, user, new Set());
        };
    }
    getRoleConfig(role) {
        return { ...this.config[role] };
    }
    getEmbedder() {
        const role = this.config.embedding;
        if (role.provider === 'deterministic_local') {
            throw new Error('Embedding role uses deterministic_local; caller should use Embedder directly.');
        }
        if (role.provider !== 'openai_compatible') {
            throw new Error(`Unsupported embedding provider: ${role.provider}`);
        }
        const client = new OpenAICompatibleClient({
            baseUrl: role.baseUrl || 'http://localhost:11434/v1',
            apiKey: role.apiKey,
            timeoutMs: role.timeoutMs
        });
        return async (text) => client.embed({
            model: role.modelName,
            input: text
        });
    }
    isRuleOnly(role) {
        return this.resolveTextProvider(role, new Set()) === 'rule_only';
    }
    async generateText(roleName, system, user, visited) {
        if (visited.has(roleName))
            return '';
        visited.add(roleName);
        const role = this.config[roleName];
        if (role.provider === 'openai_compatible') {
            const client = new OpenAICompatibleClient({
                baseUrl: role.baseUrl || 'http://localhost:11434/v1',
                apiKey: role.apiKey,
                timeoutMs: role.timeoutMs
            });
            const result = await client.chatComplete({
                model: role.modelName,
                systemPrompt: system,
                userPrompt: user
            });
            if (result.trim())
                return result;
            return this.runFallback(role.fallback, system, user, visited);
        }
        if (role.provider === 'anthropic') {
            if (!role.apiKey?.trim()) {
                return this.runFallback(role.fallback, system, user, visited);
            }
            const client = new AnthropicClient({
                apiKey: role.apiKey,
                timeoutMs: role.timeoutMs
            });
            const result = await client.chatComplete({
                model: role.modelName,
                systemPrompt: system,
                userPrompt: user
            });
            if (result.trim())
                return result;
            return this.runFallback(role.fallback, system, user, visited);
        }
        return this.runFallback(role.fallback, system, user, visited);
    }
    async runFallback(fallback, system, user, visited) {
        if (!fallback || fallback === 'rule_only' || fallback === 'deterministic_local')
            return '';
        return this.generateText(fallback, system, user, visited);
    }
    resolveTextProvider(roleName, visited) {
        if (visited.has(roleName))
            return 'rule_only';
        visited.add(roleName);
        const role = this.config[roleName];
        if (role.provider === 'rule_only') {
            if (!role.fallback || role.fallback === 'rule_only' || role.fallback === 'deterministic_local') {
                return 'rule_only';
            }
            if (role.fallback === 'memory' || role.fallback === 'reasoning') {
                return this.resolveTextProvider(role.fallback, visited);
            }
            return 'rule_only';
        }
        if (role.provider === 'deterministic_local')
            return 'rule_only';
        return role.provider;
    }
}
