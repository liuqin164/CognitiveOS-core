import { Embedder } from './Embedder.js';
import { DeterministicEmbedder } from './DeterministicEmbedder.js';
import { ModelRegistry } from '../models/ModelRegistry.js';

export type EmbeddingBackendId = 'deterministic_local' | 'transformers_remote' | 'openai_compatible';

export interface EmbeddingBackendInfo {
  backendId: EmbeddingBackendId;
  requiresModelSetup: boolean;
  mayDownloadModels: boolean;
}

export function resolveEmbeddingBackendId(): EmbeddingBackendId {
  if (process.env.AGENT_BRAIN_MODEL_EMBEDDING_PROVIDER === 'openai_compatible') {
    return 'openai_compatible';
  }
  return process.env.AGENT_BRAIN_EMBEDDING_BACKEND === 'transformers_remote'
    ? 'transformers_remote'
    : 'deterministic_local';
}

export function getEmbeddingBackendInfo(
  backendId: EmbeddingBackendId = resolveEmbeddingBackendId()
): EmbeddingBackendInfo {
  if (backendId === 'openai_compatible') {
    return { backendId, requiresModelSetup: false, mayDownloadModels: false };
  }
  return backendId === 'transformers_remote'
    ? { backendId, requiresModelSetup: false, mayDownloadModels: true }
    : { backendId, requiresModelSetup: false, mayDownloadModels: false };
}

class ModelRegistryEmbedder extends Embedder {
  constructor(private readonly embedFn: (text: string) => Promise<number[]>) {
    super();
  }

  async warmup(): Promise<void> {
    this.isLoaded = true;
    this.isWarmedUp = true;
  }

  async embed(text: string): Promise<number[]> {
    if (!this.isWarmedUp) {
      await this.warmup();
    }
    return this.embedFn(text);
  }

  isReady(): boolean {
    return this.isLoaded;
  }

  dispose(): void {
    this.isLoaded = false;
    this.isWarmedUp = false;
  }
}

export function createConfiguredEmbedder(): Embedder {
  const backendId = resolveEmbeddingBackendId();
  if (backendId === 'openai_compatible') {
    const registry = ModelRegistry.fromEnv();
    return new ModelRegistryEmbedder(registry.getEmbedder());
  }
  return backendId === 'transformers_remote'
    ? new Embedder()
    : new DeterministicEmbedder();
}
