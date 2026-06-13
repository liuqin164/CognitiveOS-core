import { type EmbeddingProvider } from './EmbeddingProvider.js';
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