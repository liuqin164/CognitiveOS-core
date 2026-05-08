import { afterEach, describe, expect, it } from 'bun:test';
import { ModelRegistry } from '../src/models/ModelRegistry.js';
import { AnthropicClient } from '../src/models/providers/AnthropicClient.js';
import { OpenAICompatibleClient } from '../src/models/providers/OpenAICompatibleClient.js';

const trackedKeys = [
  'AGENT_BRAIN_MODEL_MEMORY_PROVIDER',
  'AGENT_BRAIN_MODEL_MEMORY_BASE_URL',
  'AGENT_BRAIN_MODEL_MEMORY_API_KEY',
  'AGENT_BRAIN_MODEL_MEMORY_NAME',
  'AGENT_BRAIN_MODEL_MEMORY_TIMEOUT_MS',
  'AGENT_BRAIN_MODEL_MEMORY_FALLBACK',
  'AGENT_BRAIN_MODEL_REASONING_PROVIDER',
  'AGENT_BRAIN_MODEL_REASONING_BASE_URL',
  'AGENT_BRAIN_MODEL_REASONING_API_KEY',
  'AGENT_BRAIN_MODEL_REASONING_NAME',
  'AGENT_BRAIN_MODEL_REASONING_TIMEOUT_MS',
  'AGENT_BRAIN_MODEL_REASONING_FALLBACK',
  'AGENT_BRAIN_MODEL_EMBEDDING_PROVIDER',
  'AGENT_BRAIN_MODEL_EMBEDDING_BASE_URL',
  'AGENT_BRAIN_MODEL_EMBEDDING_API_KEY',
  'AGENT_BRAIN_MODEL_EMBEDDING_NAME',
  'AGENT_BRAIN_MODEL_EMBEDDING_TIMEOUT_MS'
] as const;

const originalEnv = Object.fromEntries(trackedKeys.map((key) => [key, process.env[key]]));
const originalOpenAIChat = OpenAICompatibleClient.prototype.chatComplete;
const originalAnthropicChat = AnthropicClient.prototype.chatComplete;

function resetEnv(): void {
  for (const key of trackedKeys) {
    const value = originalEnv[key];
    if (typeof value === 'undefined') {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}

afterEach(() => {
  resetEnv();
  OpenAICompatibleClient.prototype.chatComplete = originalOpenAIChat;
  AnthropicClient.prototype.chatComplete = originalAnthropicChat;
});

describe('ModelRegistry', () => {
  it('fromEnv defaults to rule_only text roles and deterministic_local embedding', async () => {
    resetEnv();
    const registry = ModelRegistry.fromEnv();

    expect(registry.isRuleOnly('memory')).toBe(true);
    expect(registry.isRuleOnly('reasoning')).toBe(true);
    expect(() => registry.getEmbedder()).toThrow(/deterministic_local/);
  });

  it('isRuleOnly returns true for memory when provider is rule_only', () => {
    process.env.AGENT_BRAIN_MODEL_MEMORY_PROVIDER = 'rule_only';
    process.env.AGENT_BRAIN_MODEL_MEMORY_FALLBACK = 'rule_only';

    const registry = ModelRegistry.fromEnv();

    expect(registry.isRuleOnly('memory')).toBe(true);
  });

  it('getTextGenerator for reasoning falls back to memory when reasoning is rule_only', async () => {
    process.env.AGENT_BRAIN_MODEL_REASONING_PROVIDER = 'rule_only';
    process.env.AGENT_BRAIN_MODEL_REASONING_FALLBACK = 'memory';
    process.env.AGENT_BRAIN_MODEL_MEMORY_PROVIDER = 'openai_compatible';
    process.env.AGENT_BRAIN_MODEL_MEMORY_NAME = 'memory-model';

    OpenAICompatibleClient.prototype.chatComplete = async ({ model }) => `${model}:ok`;

    const registry = ModelRegistry.fromEnv();
    const result = await registry.getTextGenerator('reasoning')('system', 'user');

    expect(result).toBe('memory-model:ok');
  });

  it('getTextGenerator for memory uses openai_compatible client', async () => {
    process.env.AGENT_BRAIN_MODEL_MEMORY_PROVIDER = 'openai_compatible';
    process.env.AGENT_BRAIN_MODEL_MEMORY_NAME = 'memory-model';

    let calledModel = '';
    OpenAICompatibleClient.prototype.chatComplete = async ({ model }) => {
      calledModel = model;
      return 'memory-result';
    };

    const registry = ModelRegistry.fromEnv();
    const result = await registry.getTextGenerator('memory')('system', 'user');

    expect(result).toBe('memory-result');
    expect(calledModel).toBe('memory-model');
  });

  it('falls back from reasoning to memory when the primary generator returns empty', async () => {
    process.env.AGENT_BRAIN_MODEL_REASONING_PROVIDER = 'openai_compatible';
    process.env.AGENT_BRAIN_MODEL_REASONING_NAME = 'reasoning-model';
    process.env.AGENT_BRAIN_MODEL_REASONING_FALLBACK = 'memory';
    process.env.AGENT_BRAIN_MODEL_MEMORY_PROVIDER = 'openai_compatible';
    process.env.AGENT_BRAIN_MODEL_MEMORY_NAME = 'memory-model';

    OpenAICompatibleClient.prototype.chatComplete = async ({ model }) => {
      if (model === 'reasoning-model') return '';
      return 'memory-fallback-result';
    };

    const registry = ModelRegistry.fromEnv();
    const result = await registry.getTextGenerator('reasoning')('system', 'user');

    expect(result).toBe('memory-fallback-result');
  });
});
