import { Embedder } from './Embedder.js';

export class DeterministicEmbedder extends Embedder {
  async warmup(): Promise<void> {
    this.isLoaded = true;
    this.isWarmedUp = true;
  }

  async embed(text: string): Promise<number[]> {
    const seed = Array.from(text).reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
    return Array.from({ length: 384 }, (_, index) => (((seed + index * 11) % 101) / 50.5) - 1);
  }

  isReady(): boolean {
    return true;
  }

  dispose(): void {
    this.isLoaded = false;
    this.isWarmedUp = false;
  }
}
