import { Embedder } from './Embedder.js';
import { ModelRegistry } from '../models/ModelRegistry.js';
export type EmbeddingBackendId = 'deterministic_local' | 'transformers_remote' | 'openai_compatible';
export interface EmbeddingBackendInfo {
    backendId: EmbeddingBackendId;
    requiresModelSetup: boolean;
    mayDownloadModels: boolean;
}
export declare function resolveEmbeddingBackendId(modelRegistry?: ModelRegistry): EmbeddingBackendId;
export declare function getEmbeddingBackendInfo(backendId?: EmbeddingBackendId): EmbeddingBackendInfo;
export declare function createConfiguredEmbedder(vectorDimension?: number, modelRegistry?: ModelRegistry): Embedder;
//# sourceMappingURL=EmbedderFactory.d.ts.map