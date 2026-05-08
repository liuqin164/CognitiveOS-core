import type { QueryIR } from '../types/query-ir.js';
import type { LocalSemanticCompiler, SemanticCompilation } from '../engine/LocalSemanticCompiler.js';
import type { EntityResolutionEngine, EntityResolutionResult } from '../engine/EntityResolutionEngine.js';
export interface CompiledQuery {
    ir: QueryIR;
    semanticCompilation: SemanticCompilation;
    entityResolution: EntityResolutionResult;
}
export declare class QueryCompiler {
    private semanticCompiler;
    private entityResolutionEngine;
    private nativeQueryParser;
    constructor(semanticCompiler: LocalSemanticCompiler, entityResolutionEngine: EntityResolutionEngine);
    compile(query: string, projectId?: string): CompiledQuery;
    private mapNativeTime;
    private parseNativeDate;
}
//# sourceMappingURL=QueryCompiler.d.ts.map