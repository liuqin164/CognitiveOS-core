import { Embedder } from './Embedder.js';
import { DeterministicEmbedder } from './DeterministicEmbedder.js';
import { ModelRegistry } from '../models/ModelRegistry.js';
export function resolveEmbeddingBackendId(modelRegistry) {
    const role = modelRegistry?.getRoleConfig('embedding');
    if (role?.provider === 'openai_compatible') {
        return 'openai_compatible';
    }
    return 'deterministic_local';
}
export function getEmbeddingBackendInfo(backendId = resolveEmbeddingBackendId()) {
    if (backendId === 'openai_compatible') {
        return { backendId, requiresModelSetup: false, mayDownloadModels: false };
    }
    return backendId === 'transformers_remote'
        ? { backendId, requiresModelSetup: false, mayDownloadModels: true }
        : { backendId, requiresModelSetup: false, mayDownloadModels: false };
}
class ModelRegistryEmbedder extends Embedder {
    embedFn;
    constructor(embedFn) {
        super();
        this.embedFn = embedFn;
    }
    async warmup() {
        this.isLoaded = true;
        this.isWarmedUp = true;
    }
    async embed(text) {
        if (!this.isWarmedUp) {
            await this.warmup();
        }
        return this.embedFn(text);
    }
    isReady() {
        return this.isLoaded;
    }
    dispose() {
        this.isLoaded = false;
        this.isWarmedUp = false;
    }
}
export function createConfiguredEmbedder(vectorDimension, modelRegistry = ModelRegistry.defaults()) {
    const backendId = resolveEmbeddingBackendId(modelRegistry);
    if (backendId === 'openai_compatible') {
        return new ModelRegistryEmbedder(modelRegistry.getEmbedder());
    }
    return backendId === 'transformers_remote'
        ? new Embedder()
        : new DeterministicEmbedder(vectorDimension);
}
