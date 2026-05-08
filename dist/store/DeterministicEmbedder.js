import { Embedder } from './Embedder.js';
import { config } from '../utils/Config.js';
export class DeterministicEmbedder extends Embedder {
    dimension;
    constructor(dimension = config.vector.dimension) {
        super();
        this.dimension = dimension;
    }
    async warmup() {
        this.isLoaded = true;
        this.isWarmedUp = true;
    }
    async embed(text) {
        const seed = Array.from(text).reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
        return Array.from({ length: this.dimension }, (_, index) => (((seed + index * 11) % 101) / 50.5) - 1);
    }
    isReady() {
        return true;
    }
    dispose() {
        this.isLoaded = false;
        this.isWarmedUp = false;
    }
}
