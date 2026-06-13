// ============================================
// 配置管理 - 统一管理所有配置
// ============================================
import { DEFAULT_VECTOR_DIMENSION } from '../config/VectorDimension.js';
const DEFAULT_CONFIG = {
    vector: {
        dimension: DEFAULT_VECTOR_DIMENSION,
        maxElements: 1000000,
        efConstruction: 200,
        efSearch: 50,
        topK: 500,
        indexPath: './data/hnsw.index'
    },
    embedding: {
        model: 'all-MiniLM-L6-v2',
        cacheDir: `${process.env.HOME || '/tmp'}/.cache/cogmem/embeddings`,
        quantized: true,
        maxSequenceLength: 512
    },
    energy: {
        initialEnergy: 100,
        decayFactor: 0.8,
        maxHops: 5
    },
    degradation: {
        memoryThresholdMB: 1024,
        slowInferenceThresholdMs: 150
    },
    index: {
        anchorInterval: 500,
        fullTextSearchLimit: 100
    },
    logging: {
        level: 'info',
        enabled: true
    },
    recall: {
        vectorFallbackThreshold: 12,
        vectorEnabled: true
    }
};
class Config {
    config;
    constructor(overrides = {}) {
        this.config = this.merge(DEFAULT_CONFIG, overrides);
    }
    merge(base, overrides) {
        const result = { ...base };
        const overrideKeys = Object.keys(overrides);
        for (const key of overrideKeys) {
            const value = overrides[key];
            if (value && typeof value === 'object' && !Array.isArray(value)) {
                result[key] = this.merge((base[key] || {}), value);
            }
            else {
                result[key] = value;
            }
        }
        return result;
    }
    get(key) {
        if (!key)
            return this.config;
        const keys = key.split('.');
        let value = this.config;
        for (const k of keys) {
            value = value?.[k];
        }
        return value;
    }
    set(key, value) {
        const keys = key.split('.');
        let obj = this.config;
        for (let i = 0; i < keys.length - 1; i++) {
            obj = obj[keys[i]];
        }
        obj[keys[keys.length - 1]] = value;
    }
    get vector() { return this.config.vector; }
    get embedding() { return this.config.embedding; }
    get energy() { return this.config.energy; }
    get degradation() { return this.config.degradation; }
    get index() { return this.config.index; }
    get logging() { return this.config.logging; }
    get recall() { return this.config.recall; }
    static default() {
        return { ...DEFAULT_CONFIG };
    }
}
export const config = new Config();
export { Config as ConfigClass };
