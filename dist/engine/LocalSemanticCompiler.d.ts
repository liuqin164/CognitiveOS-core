import type { NeuronType } from '../types/index.js';
import type { QueryIR, QuerySemanticHints } from '../types/query-ir.js';
export interface SemanticEntityCandidate {
    text: string;
    type?: string;
    confidence: number;
}
export interface SemanticTopicLink {
    topic: string;
    confidence: number;
}
export interface SemanticCompilation {
    runId: string;
    sourceType: 'memory' | 'query';
    entities: SemanticEntityCandidate[];
    topics: SemanticTopicLink[];
    temporalHints: Array<QueryIR['temporal']['relative']>;
    conditionHints: string[];
    issueHints: string[];
    ownershipSignals: string[];
    relativeReferences: string[];
    projectLinks: string[];
    tags: string[];
    confidence: number;
}
export declare class LocalSemanticCompiler {
    compileMemory(input: {
        text: string;
        projectId?: string;
        type: NeuronType;
        createdAt: number;
    }): SemanticCompilation;
    compileQuery(input: {
        text: string;
        projectId?: string;
    }): SemanticCompilation;
    mergeIntoSemantics(base: QuerySemanticHints, compilation: SemanticCompilation): QuerySemanticHints;
    private compile;
}
//# sourceMappingURL=LocalSemanticCompiler.d.ts.map