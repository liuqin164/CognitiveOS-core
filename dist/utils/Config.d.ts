import type { EmbeddingConfig } from '../types/index.js';
export interface AgentBrainConfig {
    vector: {
        dimension: number;
        maxElements: number;
        efConstruction: number;
        efSearch: number;
        topK: number;
        indexPath: string;
    };
    embedding: EmbeddingConfig;
    energy: {
        initialEnergy: number;
        decayFactor: number;
        maxHops: number;
    };
    degradation: {
        memoryThresholdMB: number;
        slowInferenceThresholdMs: number;
    };
    index: {
        anchorInterval: number;
        fullTextSearchLimit: number;
    };
    logging: {
        level: 'debug' | 'info' | 'warn' | 'error';
        enabled: boolean;
    };
    recall: {
        /** Trigger vector fallback when candidateNeuronIds.length < this. Default 12. */
        vectorFallbackThreshold: number;
        /** Master switch for vector semantic search. Default true. */
        vectorEnabled: boolean;
    };
}
declare class Config {
    private config;
    constructor(overrides?: Partial<AgentBrainConfig>);
    private merge;
    get(key?: string): unknown;
    set(key: string, value: unknown): void;
    get vector(): {
        dimension: number;
        maxElements: number;
        efConstruction: number;
        efSearch: number;
        topK: number;
        indexPath: string;
    };
    get embedding(): EmbeddingConfig;
    get energy(): {
        initialEnergy: number;
        decayFactor: number;
        maxHops: number;
    };
    get degradation(): {
        memoryThresholdMB: number;
        slowInferenceThresholdMs: number;
    };
    get index(): {
        anchorInterval: number;
        fullTextSearchLimit: number;
    };
    get logging(): {
        level: "debug" | "info" | "warn" | "error";
        enabled: boolean;
    };
    get recall(): {
        /** Trigger vector fallback when candidateNeuronIds.length < this. Default 12. */
        vectorFallbackThreshold: number;
        /** Master switch for vector semantic search. Default true. */
        vectorEnabled: boolean;
    };
    static default(): AgentBrainConfig;
}
export declare const config: Config;
export { Config as ConfigClass };
//# sourceMappingURL=Config.d.ts.map