import type { NativeQueryDirectives } from '../types/query-ir.js';
export interface NativeQueryClause {
    key: keyof NativeQueryDirectives;
    value: string;
    raw: string;
    start: number;
    end: number;
}
export interface NativeQueryParseResult {
    directives?: NativeQueryDirectives;
    clauses: NativeQueryClause[];
    residualQuery: string;
    parseMode: 'grammar';
}
export declare class NativeQueryParser {
    private static readonly KEY_ALIASES;
    parse(query: string): NativeQueryParseResult;
    private buildResidualQuery;
    private readIdentifier;
    private readValue;
    private skipWhitespace;
}
//# sourceMappingURL=NativeQueryParser.d.ts.map