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
        cacheDir: `${process.env.HOME || '/tmp'}/.cache/agent-brain/embeddings`,
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
    static fromEnv() {
        return {
            vector: {
                dimension: parsePositiveInteger(process.env.AB_VECTOR_DIMENSION, DEFAULT_CONFIG.vector.dimension),
                maxElements: parsePositiveInteger(process.env.AB_VECTOR_MAX_ELEMENTS, DEFAULT_CONFIG.vector.maxElements),
                efConstruction: parsePositiveInteger(process.env.AB_VECTOR_EF_CONSTRUCTION, DEFAULT_CONFIG.vector.efConstruction),
                efSearch: parsePositiveInteger(process.env.AB_VECTOR_EF_SEARCH, DEFAULT_CONFIG.vector.efSearch),
                topK: parsePositiveInteger(process.env.AB_VECTOR_TOP_K, DEFAULT_CONFIG.vector.topK),
                indexPath: process.env.AB_VECTOR_INDEX_PATH || DEFAULT_CONFIG.vector.indexPath
            },
            embedding: DEFAULT_CONFIG.embedding,
            energy: {
                initialEnergy: parsePositiveInteger(process.env.AB_ENERGY_INITIAL, DEFAULT_CONFIG.energy.initialEnergy),
                decayFactor: parseFloat(process.env.AB_ENERGY_DECAY || String(DEFAULT_CONFIG.energy.decayFactor)),
                maxHops: parsePositiveInteger(process.env.AB_ENERGY_HOPS, DEFAULT_CONFIG.energy.maxHops)
            },
            degradation: {
                memoryThresholdMB: parsePositiveInteger(process.env.AB_DEGRADE_MEM_THRESHOLD, DEFAULT_CONFIG.degradation.memoryThresholdMB),
                slowInferenceThresholdMs: parsePositiveInteger(process.env.AB_DEGRADE_SLOW_MS, DEFAULT_CONFIG.degradation.slowInferenceThresholdMs)
            },
            index: {
                anchorInterval: parsePositiveInteger(process.env.AB_INDEX_ANCHOR_INTERVAL, DEFAULT_CONFIG.index.anchorInterval),
                fullTextSearchLimit: parsePositiveInteger(process.env.AB_INDEX_FTS_LIMIT, DEFAULT_CONFIG.index.fullTextSearchLimit)
            },
            logging: {
                level: process.env.AB_LOG_LEVEL || DEFAULT_CONFIG.logging.level,
                enabled: process.env.AB_LOG_ENABLED !== 'false'
            },
            recall: {
                vectorFallbackThreshold: parsePositiveInteger(process.env.AB_RECALL_VECTOR_THRESHOLD, DEFAULT_CONFIG.recall.vectorFallbackThreshold),
                vectorEnabled: process.env.AB_RECALL_VECTOR_ENABLED !== 'false'
            }
        };
    }
}
function parsePositiveInteger(value, fallback) {
    const trimmed = value?.trim() || '';
    const parsed = /^[0-9]+$/.test(trimmed) ? Number(trimmed) : Number.NaN;
    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}
export const config = new Config(Config.fromEnv());
export { Config as ConfigClass };
