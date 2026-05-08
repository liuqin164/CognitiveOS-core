import { Embedder } from './Embedder.js';
export declare class DeterministicEmbedder extends Embedder {
    private readonly dimension;
    constructor(dimension?: number);
    warmup(): Promise<void>;
    embed(text: string): Promise<number[]>;
    isReady(): boolean;
    dispose(): void;
}
//# sourceMappingURL=DeterministicEmbedder.d.ts.map