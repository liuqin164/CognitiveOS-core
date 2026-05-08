export type MemoryClass = 'long_term' | 'short_term' | 'bind_first' | 'drop';
export interface MemoryGateResult {
    memoryClass: MemoryClass;
    confidence: number;
    reason: string;
}
export declare class MemoryGate {
    classify(text: string): MemoryGateResult;
}
//# sourceMappingURL=MemoryGate.d.ts.map