import type { QueryIR } from '../types/query-ir.js';
export declare class IntentParser {
    static parse(query: string): QueryIR;
    private static extractEntities;
    private static detectIntent;
    private static extractTemporal;
    private static extractSpatial;
    private static extractConstraints;
    private static extractSemantics;
    private static detectPredicateHint;
}
//# sourceMappingURL=IntentParser.d.ts.map