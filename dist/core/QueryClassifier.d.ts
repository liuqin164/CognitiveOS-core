import type { QueryOptions } from '../types/index.js';
import { BrainMode } from '../types/index.js';
export type QueryType = 'HARD' | 'STANDARD' | 'FUZZY';
export interface QueryClassification {
    type: QueryType;
    mode: BrainMode;
    confidence: number;
    reasoning: string;
}
export declare class QueryClassifier {
    /**
     * 分类查询
     */
    static classify(query: string, options?: QueryOptions): QueryClassification;
    /**
     * 判断是否是 HARD 查询
     */
    private static isHardQuery;
    /**
     * 判断是否是 FUZZY 查询
     */
    private static isFuzzyQuery;
    /**
     * 获取当前降级模式
     */
    static getCurrentMode(): BrainMode;
    /**
     * 获取降级状态
     */
    static getDegradationState(): {
        mode: BrainMode;
        trigger: string;
        timestamp: number;
    };
}
//# sourceMappingURL=QueryClassifier.d.ts.map