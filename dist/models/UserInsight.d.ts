export type UserInsightCategory = 'preference' | 'habit' | 'domain_knowledge' | 'communication_style' | 'goal';
export interface UserInsight {
    id: string;
    projectId: string;
    category: UserInsightCategory;
    content: string;
    confidence: number;
    initialConfidence?: number;
    confidenceDelta?: number;
    evidenceNeuronIds: string[];
    createdAt: number;
    lastConfirmedAt: number;
    expiresAt?: number;
}
export declare function confidenceFromEvidenceCount(count: number): number;
//# sourceMappingURL=UserInsight.d.ts.map