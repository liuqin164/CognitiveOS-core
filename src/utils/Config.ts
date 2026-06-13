// ============================================
// 配置管理 - 统一管理所有配置
// ============================================

import type { EmbeddingConfig } from '../types/index.js';
import { DEFAULT_VECTOR_DIMENSION } from '../config/VectorDimension.js';

export interface AgentBrainConfig {
  vector: {
    dimension: number;
    maxElements: number;
    efConstruction: number;
    efSearch: number;
    topK: number;
    indexPath: string;
  };
  embedding: EmbeddingConfig;
  energy: {
    initialEnergy: number;
    decayFactor: number;
    maxHops: number;
  };
  degradation: {
    memoryThresholdMB: number;
    slowInferenceThresholdMs: number;
  };
  index: {
    anchorInterval: number;
    fullTextSearchLimit: number;
  };
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    enabled: boolean;
  };
  recall: {
    /** Trigger vector fallback when candidateNeuronIds.length < this. Default 12. */
    vectorFallbackThreshold: number;
    /** Master switch for vector semantic search. Default true. */
    vectorEnabled: boolean;
  };
}

const DEFAULT_CONFIG: AgentBrainConfig = {
  vector: {
    dimension: DEFAULT_VECTOR_DIMENSION,
    maxElements: 1000000,
    efConstruction: 200,
    efSearch: 50,
    topK: 500,
    indexPath: './data/hnsw.index'
  },
  embedding: {
    model: 'all-MiniLM-L6-v2',
    cacheDir: `${process.env.HOME || '/tmp'}/.cache/cogmem/embeddings`,
    quantized: true,
    maxSequenceLength: 512
  },
  energy: {
    initialEnergy: 100,
    decayFactor: 0.8,
    maxHops: 5
  },
  degradation: {
    memoryThresholdMB: 1024,
    slowInferenceThresholdMs: 150
  },
  index: {
    anchorInterval: 500,
    fullTextSearchLimit: 100
  },
  logging: {
    level: 'info',
    enabled: true
  },
  recall: {
    vectorFallbackThreshold: 12,
    vectorEnabled: true
  }
};

class Config {
  private config: AgentBrainConfig;

  constructor(overrides: Partial<AgentBrainConfig> = {}) {
    this.config = this.merge(DEFAULT_CONFIG, overrides);
  }

  private merge(base: AgentBrainConfig, overrides: Partial<AgentBrainConfig>): AgentBrainConfig {
    const result = { ...base } as Record<string, unknown>;
    const overrideKeys = Object.keys(overrides) as (keyof AgentBrainConfig)[];
    for (const key of overrideKeys) {
      const value = overrides[key];
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        result[key] = this.merge(
          (base[key] || {}) as unknown as AgentBrainConfig,
          value as unknown as Partial<AgentBrainConfig>
        ) as unknown as AgentBrainConfig[keyof AgentBrainConfig];
      } else {
        result[key] = value;
      }
    }
    return result as unknown as AgentBrainConfig;
  }

  get(key?: string): unknown {
    if (!key) return this.config;
    const keys = key.split('.');
    let value: unknown = this.config;
    for (const k of keys) {
      value = (value as Record<string, unknown>)?.[k];
    }
    return value;
  }

  set(key: string, value: unknown): void {
    const keys = key.split('.');
    let obj: Record<string, unknown> = this.config as unknown as Record<string, unknown>;
    for (let i = 0; i < keys.length - 1; i++) {
      obj = obj[keys[i]] as Record<string, unknown>;
    }
    obj[keys[keys.length - 1]] = value;
  }

  get vector() { return this.config.vector; }
  get embedding() { return this.config.embedding; }
  get energy() { return this.config.energy; }
  get degradation() { return this.config.degradation; }
  get index() { return this.config.index; }
  get logging() { return this.config.logging; }
  get recall() { return this.config.recall; }

  static default(): AgentBrainConfig {
    return { ...DEFAULT_CONFIG };
  }

}

export const config = new Config();
export { Config as ConfigClass };
