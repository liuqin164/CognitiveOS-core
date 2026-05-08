import type { EmbeddingConfig } from '../types/index.js';
export declare class Embedder {
    private model;
    private config;
    isWarmedUp: boolean;
    isLoaded: boolean;
    constructor(config?: Partial<EmbeddingConfig>);
    warmup(): Promise<void>;
    embed(text: string): Promise<number[]>;
    isReady(): boolean;
    dispose(): void;
    getConfig(): EmbeddingConfig;
}
//# sourceMappingURL=Embedder.d.ts.map