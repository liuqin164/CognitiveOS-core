import { type EmbeddingProvider } from './EmbeddingProvider.js';
export interface OllamaEmbeddingConfig {
    baseUrl?: string;
    model?: string;
    batchSize?: number;
    timeoutMs?: number;
}
export declare class OllamaEmbeddingProvider implements EmbeddingProvider {
    private static readonly MODEL_DIMENSIONS;
    readonly modelId: string;
    private readonly baseUrl;
    private readonly model;
    private readonly batchSize;
    private readonly timeoutMs;
    constructor(config?: OllamaEmbeddingConfig);
    get dimensions(): number;
    embedBatch(texts: string[]): Promise<Float32Array[]>;
    embed(text: string): Promise<Float32Array>;
    private requestBatch;
}
//# sourceMappingURL=OllamaEmbeddingProvider.d.ts.map