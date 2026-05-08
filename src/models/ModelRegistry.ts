// @ts-nocheck
import type {
  EmbedFn,
  ModelRegistryConfig,
  ModelRoleConfig,
  ModelRoleName,
  ProviderType,
  TextGenerateFn
} from './ModelRole.js';
import { AnthropicClient } from './providers/AnthropicClient.js';
import { OpenAICompatibleClient } from './providers/OpenAICompatibleClient.js';

function parseTimeout(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value || '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseProvider(value: string | undefined, fallback: ProviderType): ProviderType {
  const normalized = (value || fallback).trim() as ProviderType;
  return normalized === 'openai_compatible'
    || normalized === 'anthropic'
    || normalized === 'rule_only'
    || normalized === 'deterministic_local'
    ? normalized
    : fallback;
}

function parseFallback(
  value: string | undefined,
  fallback: ModelRoleName | 'rule_only' | 'deterministic_local'
): ModelRoleName | 'rule_only' | 'deterministic_local' {
  const normalized = (value || fallback).trim();
  return normalized === 'memory'
    || normalized === 'reasoning'
    || normalized === 'embedding'
    || normalized === 'rule_only'
    || normalized === 'deterministic_local'
    ? normalized
    : fallback;
}

export class ModelRegistry {
  constructor(private config: ModelRegistryConfig) {}

  static fromEnv(): ModelRegistry {
    return new ModelRegistry({
      memory: {
        role: 'memory',
        provider: parseProvider(process.env.AGENT_BRAIN_MODEL_MEMORY_PROVIDER, 'rule_only'),
        baseUrl: process.env.AGENT_BRAIN_MODEL_MEMORY_BASE_URL || 'http://localhost:11434/v1',
        apiKey: process.env.AGENT_BRAIN_MODEL_MEMORY_API_KEY || '',
        modelName: process.env.AGENT_BRAIN_MODEL_MEMORY_NAME || 'qwen2.5:7b',
        timeoutMs: parseTimeout(process.env.AGENT_BRAIN_MODEL_MEMORY_TIMEOUT_MS, 60000),
        fallback: parseFallback(process.env.AGENT_BRAIN_MODEL_MEMORY_FALLBACK, 'rule_only')
      },
      reasoning: {
        role: 'reasoning',
        provider: parseProvider(process.env.AGENT_BRAIN_MODEL_REASONING_PROVIDER, 'rule_only'),
        baseUrl: process.env.AGENT_BRAIN_MODEL_REASONING_BASE_URL || 'http://localhost:11434/v1',
        apiKey: process.env.AGENT_BRAIN_MODEL_REASONING_API_KEY || '',
        modelName: process.env.AGENT_BRAIN_MODEL_REASONING_NAME || 'qwen2.5:7b',
        timeoutMs: parseTimeout(process.env.AGENT_BRAIN_MODEL_REASONING_TIMEOUT_MS, 60000),
        fallback: parseFallback(process.env.AGENT_BRAIN_MODEL_REASONING_FALLBACK, 'memory')
      },
      embedding: {
        role: 'embedding',
        provider: parseProvider(process.env.AGENT_BRAIN_MODEL_EMBEDDING_PROVIDER, 'deterministic_local'),
        baseUrl: process.env.AGENT_BRAIN_MODEL_EMBEDDING_BASE_URL || 'http://localhost:11434/v1',
        apiKey: process.env.AGENT_BRAIN_MODEL_EMBEDDING_API_KEY || '',
        modelName: process.env.AGENT_BRAIN_MODEL_EMBEDDING_NAME || 'nomic-embed-text',
        timeoutMs: parseTimeout(process.env.AGENT_BRAIN_MODEL_EMBEDDING_TIMEOUT_MS, 30000)
      }
    });
  }

  getTextGenerator(role: 'memory' | 'reasoning'): TextGenerateFn {
    return async (system: string, user: string): Promise<string> => {
      return this.generateText(role, system, user, new Set<ModelRoleName>());
    };
  }

  getRoleConfig(role: ModelRoleName): ModelRoleConfig {
    return { ...this.config[role] };
  }

  getEmbedder(): EmbedFn {
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
    return async (text: string): Promise<number[]> => client.embed({
      model: role.modelName,
      input: text
    });
  }

  isRuleOnly(role: 'memory' | 'reasoning'): boolean {
    return this.resolveTextProvider(role, new Set<ModelRoleName>()) === 'rule_only';
  }

  private async generateText(
    roleName: 'memory' | 'reasoning',
    system: string,
    user: string,
    visited: Set<ModelRoleName>
  ): Promise<string> {
    if (visited.has(roleName)) return '';
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
      if (result.trim()) return result;
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
      if (result.trim()) return result;
      return this.runFallback(role.fallback, system, user, visited);
    }

    return this.runFallback(role.fallback, system, user, visited);
  }

  private async runFallback(
    fallback: ModelRoleConfig['fallback'],
    system: string,
    user: string,
    visited: Set<ModelRoleName>
  ): Promise<string> {
    if (!fallback || fallback === 'rule_only' || fallback === 'deterministic_local') return '';
    return this.generateText(fallback, system, user, visited);
  }

  private resolveTextProvider(roleName: 'memory' | 'reasoning', visited: Set<ModelRoleName>): ProviderType {
    if (visited.has(roleName)) return 'rule_only';
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

    if (role.provider === 'deterministic_local') return 'rule_only';
    return role.provider;
  }
}
