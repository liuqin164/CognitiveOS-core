import type { MemoryImportanceLevel } from '../types/index.js';
export declare const PERMANENT_SIGNALS: readonly RegExp[];
export declare const IMPORTANT_SIGNALS: readonly RegExp[];
export declare class ImportanceSignalDetector {
    private readonly permanentSignals;
    private readonly importantSignals;
    constructor(permanentSignals?: readonly RegExp[], importantSignals?: readonly RegExp[]);
    detect(content: string): MemoryImportanceLevel;
    static detect(content: string): MemoryImportanceLevel;
}
//# sourceMappingURL=ImportanceSignalDetector.d.ts.map