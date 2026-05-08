import { EmbeddingUnavailableError, embedOne } from './EmbeddingProvider.js';
export class OllamaEmbeddingProvider {
    static MODEL_DIMENSIONS = {
        'qwen3-embedding:0.6b': 1024,
        'qwen3-embedding:4b': 2560,
        'qwen3-embedding:8b': 4096
    };
    modelId;
    baseUrl;
    model;
    batchSize;
    timeoutMs;
    constructor(config = {}) {
        this.baseUrl = (config.baseUrl || 'http://localhost:11434').replace(/\/+$/, '');
        this.model = config.model || 'qwen3-embedding:0.6b';
        this.batchSize = config.batchSize ?? 32;
        this.timeoutMs = config.timeoutMs ?? 10_000;
        this.modelId = `ollama/${this.model}`;
    }
    get dimensions() {
        return OllamaEmbeddingProvider.MODEL_DIMENSIONS[this.model] ?? 1024;
    }
    async embedBatch(texts) {
        const vectors = [];
        for (let index = 0; index < texts.length; index += this.batchSize) {
            vectors.push(...await this.requestBatch(texts.slice(index, index + this.batchSize)));
        }
        return vectors;
    }
    embed(text) {
        return embedOne(this, text);
    }
    async requestBatch(texts) {
        if (texts.length === 0)
            return [];
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), this.timeoutMs);
        try {
            const response = await fetch(`${this.baseUrl}/api/embed`, {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ model: this.model, input: texts }),
                signal: controller.signal
            });
            if (!response.ok)
                throw new Error(`Ollama embedding request failed: ${response.status}`);
            const payload = await response.json();
            const rawVectors = payload.embeddings || (payload.embedding ? [payload.embedding] : []);
            if (rawVectors.length !== texts.length) {
                throw new Error(`Ollama returned ${rawVectors.length} embeddings for ${texts.length} inputs`);
            }
            const wrongDimension = rawVectors.find((vector) => vector.length !== this.dimensions);
            if (wrongDimension) {
                throw new Error(`Ollama returned ${wrongDimension.length} dimensions for ${this.model}; expected ${this.dimensions}`);
            }
            return rawVectors.map((vector) => new Float32Array(vector));
        }
        catch (error) {
            throw new EmbeddingUnavailableError('Ollama embedding provider is unavailable', error);
        }
        finally {
            clearTimeout(timer);
        }
    }
}
