import { type EmbeddingProvider } from './EmbeddingProvider.js';
/**
 * @deprecated Since v1.13, use `QwenAPIEmbeddingProvider` from
 * `@CognitiveOS/embeddings-qwen`. The core export remains for v1.x
 * compatibility only.
 */
export interface QwenAPIEmbeddingConfig {
    apiKey: string;
    model?: string;
    timeoutMs?: number;
    baseUrl?: string;
}
/**
 * @deprecated Since v1.13, use `QwenAPIEmbeddingProvider` from
 * `@CognitiveOS/embeddings-qwen`.
 */
export declare class QwenAPIEmbeddingProvider implements EmbeddingProvider {
    private readonly config;
    readonly dimensions = 1024;
    readonly modelId: string;
    private readonly model;
    private readonly baseUrl;
    private readonly timeoutMs;
    constructor(config: QwenAPIEmbeddingConfig);
    embedBatch(texts: string[]): Promise<Float32Array[]>;
    embed(text: string): Promise<Float32Array>;
}
//# sourceMappingURL=QwenAPIEmbeddingProvider.d.ts.map