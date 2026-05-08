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
export declare class EmbeddingUnavailableError extends Error {
    readonly cause?: unknown | undefined;
    constructor(message: string, cause?: unknown | undefined);
}
export declare function embedOne(provider: EmbeddingProvider, text: string): Promise<Float32Array>;
//# sourceMappingURL=EmbeddingProvider.d.ts.map