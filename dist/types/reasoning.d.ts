export type ReasoningStepRole = 'premise' | 'hypothesis' | 'evidence' | 'conclusion';
export type SourceType = 'user_input' | 'llm_inference' | 'verified_fact';
export type ReasoningOutcome = 'pending' | 'confirmed' | 'refuted' | 'inconclusive';
export interface ReasoningStep {
    neuronId: string;
    role: ReasoningStepRole;
    order: number;
}
export interface ReasoningChain {
    id: string;
    steps: ReasoningStep[];
    outcome: ReasoningOutcome;
    projectId?: string;
    createdAt: number;
}
//# sourceMappingURL=reasoning.d.ts.map