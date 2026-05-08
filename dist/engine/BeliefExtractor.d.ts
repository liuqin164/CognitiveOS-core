import type { BeliefCandidate, Neuron } from '../types/index.js';
interface ExtractionContext {
    neuron: Neuron;
    sourceEventId: string;
}
export declare class BeliefExtractor {
    extract(context: ExtractionContext): BeliefCandidate[];
    private extractSchemaRules;
    private extractFactRules;
    private extractMultiSlotFacts;
    private extractProceduralSequences;
    private extractExecutablePlanGraphs;
    private extractNestedFactGraphs;
    private extractTemporalWindow;
    private extractCondition;
    private resolveValidityKind;
    private getBaseContext;
    private normalizeEntity;
    private normalizeFactValue;
    private parseSequenceSteps;
    private buildConditionDsl;
    private toConditionClause;
    private parseConditionExpression;
    private flattenConditionClauses;
    private normalizeConditionOperators;
    private stripOuterParentheses;
    private isBalancedParentheses;
    private splitTopLevelByOperators;
    private parseNestedFactGraph;
    private parseExecutablePlanGraph;
    private parsePlanHandlers;
    private parseHandlerSteps;
    private parseRetryPolicies;
    private parseMergePoints;
    private parseBranchPoints;
    private parseStateTransitions;
    private parsePolicyExecutors;
    private parseExecutionGuards;
    private parseStateMachines;
    private parsePolicyRuntime;
    private parseMergeConstraints;
    private parseRuntimeValidation;
    private parseExecutorBindings;
    private parseMergePropagation;
    private dedupeCandidates;
}
export {};
//# sourceMappingURL=BeliefExtractor.d.ts.map