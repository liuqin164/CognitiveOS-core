export interface NarrativeRecallSummary {
    headline: string;
    path: string[];
    whyMatched: string[];
    runtimeSegments: Array<{
        stage: string;
        label: string;
        count?: number;
    }>;
}
export declare class NarrativeRecallAssembler {
    assemble(input: {
        query: string;
        plannerReasons: string[];
        pulseTrace: Array<{
            stage: string;
            candidateCount: number;
            reason: string;
        }>;
        temporalLabels: string[];
        branchIds: string[];
        entityIds: string[];
        denseJointCount?: number;
        traversalPath?: string[];
        traversalSegments?: Array<{
            stage: string;
            label: string;
            count?: number;
        }>;
    }): NarrativeRecallSummary;
}
//# sourceMappingURL=NarrativeRecallAssembler.d.ts.map