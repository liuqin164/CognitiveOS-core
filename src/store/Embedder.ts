// ============================================
// 嵌入模型 - @xenova/transformers 实现
// ============================================

import type { EmbeddingConfig } from '../types/index.js';
import { logger } from '../utils/Logger.js';

interface EmbeddingPipeline {
  (text: string | string[], options?: { pooling?: string; normalize?: boolean }): Promise<{ data: Float32Array }>;
}

interface TransformersModule {
  pipeline: (
    task: 'feature-extraction',
    model: string
  ) => Promise<EmbeddingPipeline>;
  env: {
    allowLocalModels: boolean;
    useBrowserCache: boolean;
    allowRemoteModels: boolean;
    cacheDir: string;
  };
}

async function loadTransformers(): Promise<TransformersModule> {
  return await import('@xenova/transformers') as TransformersModule;
}

function configureEnv(transformers: TransformersModule, config: EmbeddingConfig): void {
  transformers.env.allowLocalModels = false;
  transformers.env.useBrowserCache = false;
  transformers.env.allowRemoteModels = true;
  transformers.env.cacheDir = config.cacheDir;
}

export class Embedder {
  private model: EmbeddingPipeline | null = null;
  private config: EmbeddingConfig;
  public isWarmedUp: boolean = false;
  public isLoaded: boolean = false;

  constructor(config: Partial<EmbeddingConfig> = {}) {
    this.config = {
      model: config.model || 'all-MiniLM-L6-v2',
      cacheDir: config.cacheDir || `${process.env.HOME || '/tmp'}/.cache/agent-brain/embeddings`,
      quantized: config.quantized ?? true,
      maxSequenceLength: config.maxSequenceLength || 512
    };
  }

  async warmup(): Promise<void> {
    if (this.isWarmedUp) return;
    const transformers = await loadTransformers();
    configureEnv(transformers, this.config);
    this.model = await transformers.pipeline('feature-extraction', this.config.model) as EmbeddingPipeline;
    this.isWarmedUp = true;
    this.isLoaded = true;
  }

  async embed(text: string): Promise<number[]> {
    if (!this.model) await this.warmup();
    const result = await this.model!(text, { pooling: 'mean', normalize: true });
    return Array.from(result.data);
  }

  isReady(): boolean {
    return this.isLoaded;
  }

  dispose(): void {
    this.model = null;
    this.isLoaded = false;
    this.isWarmedUp = false;
  }

  getConfig(): EmbeddingConfig {
    return this.config;
  }
}
