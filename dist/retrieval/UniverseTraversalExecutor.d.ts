import type { TemporalTraversalSegment } from './TemporalBranchSearch.js';
export interface UniverseTraversalSegment {
    stage: 'temporal' | 'day' | 'adjacent_days' | 'project_branch' | 'task_branch' | 'event_cluster' | 'dense';
    key: string;
    label: string;
    count?: number;
}
export interface UniverseTraversalExecution {
    path: string[];
    segments: UniverseTraversalSegment[];
}
export declare class UniverseTraversalExecutor {
    execute(input: {
        temporalSegments: TemporalTraversalSegment[];
        branchIds: string[];
        taskIds: string[];
        clusterIds: string[];
        denseJointCount: number;
    }): UniverseTraversalExecution;
}
//# sourceMappingURL=UniverseTraversalExecutor.d.ts.map