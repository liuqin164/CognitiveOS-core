// ============================================
// 嵌入模型 - @xenova/transformers 实现
// ============================================
async function loadTransformers() {
    return await import('@xenova/transformers');
}
function configureEnv(transformers, config) {
    transformers.env.allowLocalModels = false;
    transformers.env.useBrowserCache = false;
    transformers.env.allowRemoteModels = true;
    transformers.env.cacheDir = config.cacheDir;
}
export class Embedder {
    model = null;
    config;
    isWarmedUp = false;
    isLoaded = false;
    constructor(config = {}) {
        this.config = {
            model: config.model || 'all-MiniLM-L6-v2',
            cacheDir: config.cacheDir || `${process.env.HOME || '/tmp'}/.cache/cogmem/embeddings`,
            quantized: config.quantized ?? true,
            maxSequenceLength: config.maxSequenceLength || 512
        };
    }
    async warmup() {
        if (this.isWarmedUp)
            return;
        const transformers = await loadTransformers();
        configureEnv(transformers, this.config);
        this.model = await transformers.pipeline('feature-extraction', this.config.model);
        this.isWarmedUp = true;
        this.isLoaded = true;
    }
    async embed(text) {
        if (!this.model)
            await this.warmup();
        const result = await this.model(text, { pooling: 'mean', normalize: true });
        return Array.from(result.data);
    }
    isReady() {
        return this.isLoaded;
    }
    dispose() {
        this.model = null;
        this.isLoaded = false;
        this.isWarmedUp = false;
    }
    getConfig() {
        return this.config;
    }
}
