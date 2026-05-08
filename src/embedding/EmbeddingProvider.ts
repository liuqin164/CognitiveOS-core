export interface EmbeddingProvider {
  /**
   * Vector dimensions. SQLite stores vectors in variable-size BLOB fields, so
   * this is a runtime correctness contract rather than a schema allocation.
   */
  readonly dimensions: number;
  readonly modelId: string;
  embedBatch(texts: string[]): Promise<Float32Array[]>;
  embed(text: string): Promise<Float32Array>;
}

export class EmbeddingUnavailableError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = 'EmbeddingUnavailableError';
  }
}

export async function embedOne(provider: EmbeddingProvider, text: string): Promise<Float32Array> {
  const [vector] = await provider.embedBatch([text]);
  return vector;
}
