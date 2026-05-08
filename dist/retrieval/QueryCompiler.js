import { IntentParser } from '../core/IntentParser.js';
import { NativeQueryParser } from './NativeQueryParser.js';
export class QueryCompiler {
    semanticCompiler;
    entityResolutionEngine;
    nativeQueryParser = new NativeQueryParser();
    constructor(semanticCompiler, entityResolutionEngine) {
        this.semanticCompiler = semanticCompiler;
        this.entityResolutionEngine = entityResolutionEngine;
    }
    compile(query, projectId) {
        const nativeQuery = this.nativeQueryParser.parse(query);
        const effectiveQuery = nativeQuery.residualQuery || query;
        const baseIr = IntentParser.parse(effectiveQuery);
        const semanticCompilation = this.semanticCompiler.compileQuery({ text: effectiveQuery, projectId });
        const nativeDirectives = nativeQuery.directives;
        const ir = {
            ...baseIr,
            semantics: this.semanticCompiler.mergeIntoSemantics(baseIr.semantics, semanticCompilation),
            nativeDirectives,
            nativeQueryDebug: {
                parseMode: nativeQuery.parseMode,
                residualQuery: nativeQuery.residualQuery,
                clauses: nativeQuery.clauses.map((clause) => ({ key: clause.key, value: clause.value }))
            }
        };
        if (!ir.spatial.projectId && nativeDirectives?.project) {
            ir.spatial.projectId = nativeDirectives.project;
        }
        if (nativeDirectives?.entity) {
            ir.entities = Array.from(new Set([nativeDirectives.entity, ...ir.entities]));
            ir.semantics.entityHints = Array.from(new Set([nativeDirectives.entity, ...ir.semantics.entityHints]));
        }
        if (nativeDirectives?.entityType) {
            ir.semantics.valueHints = Array.from(new Set([nativeDirectives.entityType, ...ir.semantics.valueHints]));
        }
        if (nativeDirectives?.branch) {
            ir.shouldMatch = Array.from(new Set([nativeDirectives.branch, ...ir.shouldMatch]));
            ir.semantics.valueHints = Array.from(new Set([nativeDirectives.branch, ...ir.semantics.valueHints]));
        }
        if (nativeDirectives?.task) {
            ir.shouldMatch = Array.from(new Set([nativeDirectives.task, ...ir.shouldMatch]));
            ir.semantics.valueHints = Array.from(new Set([nativeDirectives.task, ...ir.semantics.valueHints]));
        }
        if (nativeDirectives?.cluster) {
            ir.shouldMatch = Array.from(new Set([nativeDirectives.cluster, ...ir.shouldMatch]));
            ir.semantics.valueHints = Array.from(new Set([nativeDirectives.cluster, ...ir.semantics.valueHints]));
        }
        if (!ir.temporal.relative && semanticCompilation.temporalHints.length > 0) {
            ir.temporal.relative = semanticCompilation.temporalHints[0];
        }
        if (!ir.temporal.relative && nativeDirectives?.time) {
            ir.temporal.relative = this.mapNativeTime(nativeDirectives.time);
        }
        if (!ir.temporal.start && nativeDirectives?.from) {
            const start = this.parseNativeDate(nativeDirectives.from);
            if (start !== undefined)
                ir.temporal.start = start;
        }
        if (!ir.temporal.end && nativeDirectives?.to) {
            const end = this.parseNativeDate(nativeDirectives.to, true);
            if (end !== undefined)
                ir.temporal.end = end;
        }
        if (!ir.temporal.relative && !ir.temporal.start && !ir.temporal.end && nativeDirectives?.around) {
            const center = this.parseNativeDate(nativeDirectives.around);
            if (center !== undefined) {
                ir.temporal.start = center - 7 * 86400000;
                ir.temporal.end = center + 7 * 86400000;
            }
        }
        const entityResolution = this.entityResolutionEngine.resolve({ query: effectiveQuery, ir, projectId });
        return { ir, semanticCompilation, entityResolution };
    }
    mapNativeTime(value) {
        const lowered = value.toLowerCase();
        if (/halfyear|half-year|6m|six-months/.test(lowered))
            return 'around_half_year_ago';
        if (/year|1y|12m/.test(lowered))
            return 'past_year';
        if (/month|1m/.test(lowered))
            return 'this_month';
        if (/week|1w/.test(lowered))
            return 'this_week';
        if (/today|day|1d/.test(lowered))
            return 'today';
        return undefined;
    }
    parseNativeDate(value, endOfDay = false) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(value))
            return undefined;
        const ts = new Date(value).getTime();
        if (Number.isNaN(ts))
            return undefined;
        return endOfDay ? ts + 86400000 - 1 : ts;
    }
}
