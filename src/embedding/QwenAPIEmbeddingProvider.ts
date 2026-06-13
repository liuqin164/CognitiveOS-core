import { EmbeddingUnavailableError, embedOne, type EmbeddingProvider } from './EmbeddingProvider.js';

/**
 * @deprecated Use an OpenAI-compatible embedding endpoint through TOML config.
 * This core export remains only for source compatibility with older builds.
 */
export interface QwenAPIEmbeddingConfig {
  apiKey: string;
  model?: string;
  timeoutMs?: number;
  baseUrl?: string;
}

/**
 * @deprecated Use an OpenAI-compatible embedding endpoint through TOML config.
 */
export class QwenAPIEmbeddingProvider implements EmbeddingProvider {
  readonly dimensions = 1024;
  readonly modelId: string;
  private readonly model: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(private readonly config: QwenAPIEmbeddingConfig) {
    this.model = config.model || 'text-embedding-v3';
    this.baseUrl = config.baseUrl || 'https://dashscope.aliyuncs.com/compatible-mode/v1/embeddings';
    this.timeoutMs = config.timeoutMs ?? 15_000;
    this.modelId = `qwen-api/${this.model}`;
  }

  async embedBatch(texts: string[]): Promise<Float32Array[]> {
    if (texts.length === 0) return [];
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${this.config.apiKey}`,
          'content-type': 'application/json'
        },
        body: JSON.stringify({ model: this.model, input: texts }),
        signal: controller.signal
      });
      if (!response.ok) throw new Error(`Qwen embedding request failed: ${response.status}`);
      const payload = await response.json() as { data?: Array<{ embedding: number[] }> };
      const rawVectors = payload.data?.map((item) => item.embedding) || [];
      if (rawVectors.length !== texts.length) {
        throw new Error(`Qwen API returned ${rawVectors.length} embeddings for ${texts.length} inputs`);
      }
      return rawVectors.map((vector) => new Float32Array(vector));
    } catch (error) {
      throw new EmbeddingUnavailableError('Qwen API embedding provider is unavailable', error);
    } finally {
      clearTimeout(timer);
    }
  }

  embed(text: string): Promise<Float32Array> {
    return embedOne(this, text);
  }
}
