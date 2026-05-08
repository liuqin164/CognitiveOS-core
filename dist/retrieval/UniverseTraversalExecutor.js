export class UniverseTraversalExecutor {
    execute(input) {
        const temporalSegments = input.temporalSegments
            .slice()
            .sort((a, b) => a.bucketStart - b.bucketStart);
        const segments = [];
        segments.push({
            stage: 'temporal',
            key: 'temporal-root',
            label: temporalSegments[0]?.label || 'temporal:none',
            count: temporalSegments.length
        });
        const firstTemporal = temporalSegments[0];
        if (firstTemporal) {
            segments.push({
                stage: 'day',
                key: firstTemporal.bucketId,
                label: firstTemporal.label,
                count: firstTemporal.neuronIds.length
            });
        }
        for (const segment of temporalSegments.slice(1, 4)) {
            segments.push({
                stage: 'adjacent_days',
                key: segment.bucketId,
                label: segment.label,
                count: segment.neuronIds.length
            });
        }
        const preferredBranches = Array.from(new Set([
            ...temporalSegments.flatMap((segment) => segment.branchIds),
            ...input.branchIds
        ]));
        const preferredTasks = Array.from(new Set([
            ...temporalSegments.flatMap((segment) => segment.taskIds),
            ...input.taskIds
        ]));
        const preferredClusters = Array.from(new Set([
            ...temporalSegments.flatMap((segment) => segment.clusterIds),
            ...input.clusterIds
        ]));
        for (const branchId of preferredBranches.slice(0, 3)) {
            segments.push({
                stage: 'project_branch',
                key: branchId,
                label: `branch:${branchId}`,
                count: 1
            });
        }
        for (const taskId of preferredTasks.slice(0, 3)) {
            segments.push({
                stage: 'task_branch',
                key: taskId,
                label: `task:${taskId}`,
                count: 1
            });
        }
        for (const clusterId of preferredClusters.slice(0, 3)) {
            segments.push({
                stage: 'event_cluster',
                key: clusterId,
                label: `cluster:${clusterId}`,
                count: 1
            });
        }
        segments.push({
            stage: 'dense',
            key: 'dense_joint',
            label: 'dense_joint_search',
            count: input.denseJointCount
        });
        return {
            path: segments.map((segment) => `${segment.stage}:${segment.label}`),
            segments
        };
    }
}
