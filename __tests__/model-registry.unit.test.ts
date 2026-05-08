import { afterEach, describe, expect, it } from 'bun:test';
import { ModelRegistry } from '../src/models/ModelRegistry.js';
import { AnthropicClient } from '../src/models/providers/AnthropicClient.js';
import { OpenAICompatibleClient } from '../src/models/providers/OpenAICompatibleClient.js';

const originalOpenAIChat = OpenAICompatibleClient.prototype.chatComplete;
const originalAnthropicChat = AnthropicClient.prototype.chatComplete;

afterEach(() => {
  OpenAICompatibleClient.prototype.chatComplete = originalOpenAIChat;
  AnthropicClient.prototype.chatComplete = originalAnthropicChat;
});

describe('ModelRegistry', () => {
  it('has deterministic defaults without reading process env', async () => {
    const previous = process.env.AGENT_BRAIN_MODEL_MEMORY_PROVIDER;
    process.env.AGENT_BRAIN_MODEL_MEMORY_PROVIDER = 'openai_compatible';
    try {
      const registry = ModelRegistry.defaults();

      expect('fromEnv' in ModelRegistry).toBe(false);
      expect(registry.isRuleOnly('memory')).toBe(true);
      expect(registry.isRuleOnly('reasoning')).toBe(true);
      expect(() => registry.getEmbedder()).toThrow(/deterministic_local/);
    } finally {
      if (previous === undefined) delete process.env.AGENT_BRAIN_MODEL_MEMORY_PROVIDER;
      else process.env.AGENT_BRAIN_MODEL_MEMORY_PROVIDER = previous;
    }
  });

  it('isRuleOnly returns true for memory when provider is rule_only', () => {
    const registry = new ModelRegistry({
      ...ModelRegistry.defaultConfig(),
      memory: {
        role: 'memory',
        provider: 'rule_only',
        modelName: 'rule_only',
        fallback: 'rule_only',
      },
    });

    expect(registry.isRuleOnly('memory')).toBe(true);
  });

  it('getTextGenerator for reasoning falls back to memory when reasoning is rule_only', async () => {
    OpenAICompatibleClient.prototype.chatComplete = async ({ model }) => `${model}:ok`;

    const registry = new ModelRegistry({
      ...ModelRegistry.defaultConfig(),
      memory: {
        role: 'memory',
        provider: 'openai_compatible',
        baseUrl: 'http://localhost:11434/v1',
        modelName: 'memory-model',
      },
      reasoning: {
        role: 'reasoning',
        provider: 'rule_only',
        modelName: 'rule_only',
        fallback: 'memory',
      },
    });
    const result = await registry.getTextGenerator('reasoning')('system', 'user');

    expect(result).toBe('memory-model:ok');
  });

  it('getTextGenerator for memory uses openai_compatible client', async () => {
    let calledModel = '';
    OpenAICompatibleClient.prototype.chatComplete = async ({ model }) => {
      calledModel = model;
      return 'memory-result';
    };

    const registry = new ModelRegistry({
      ...ModelRegistry.defaultConfig(),
      memory: {
        role: 'memory',
        provider: 'openai_compatible',
        baseUrl: 'http://localhost:11434/v1',
        modelName: 'memory-model',
      },
    });
    const result = await registry.getTextGenerator('memory')('system', 'user');

    expect(result).toBe('memory-result');
    expect(calledModel).toBe('memory-model');
  });

  it('falls back from reasoning to memory when the primary generator returns empty', async () => {
    OpenAICompatibleClient.prototype.chatComplete = async ({ model }) => {
      if (model === 'reasoning-model') return '';
      return 'memory-fallback-result';
    };

    const registry = new ModelRegistry({
      ...ModelRegistry.defaultConfig(),
      memory: {
        role: 'memory',
        provider: 'openai_compatible',
        baseUrl: 'http://localhost:11434/v1',
        modelName: 'memory-model',
      },
      reasoning: {
        role: 'reasoning',
        provider: 'openai_compatible',
        baseUrl: 'http://localhost:11434/v1',
        modelName: 'reasoning-model',
        fallback: 'memory',
      },
    });
    const result = await registry.getTextGenerator('reasoning')('system', 'user');

    expect(result).toBe('memory-fallback-result');
  });
});
