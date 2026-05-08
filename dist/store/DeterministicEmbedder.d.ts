import { Embedder } from './Embedder.js';
export declare class DeterministicEmbedder extends Embedder {
    warmup(): Promise<void>;
    embed(text: string): Promise<number[]>;
    isReady(): boolean;
    dispose(): void;
}
//# sourceMappingURL=DeterministicEmbedder.d.ts.map