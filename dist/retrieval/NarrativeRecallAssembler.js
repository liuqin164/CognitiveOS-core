export class NarrativeRecallAssembler {
    assemble(input) {
        const path = input.traversalPath && input.traversalPath.length > 0
            ? input.traversalPath
            : [
                ...input.entityIds.slice(0, 3).map((id) => `entity:${id}`),
                ...input.temporalLabels.slice(0, 3).map((label) => `time:${label}`),
                ...input.branchIds.slice(0, 3).map((id) => `branch:${id}`)
            ];
        return {
            headline: `universe navigation for: ${input.query}`,
            path,
            whyMatched: Array.from(new Set([
                ...input.plannerReasons.slice(0, 4),
                ...input.pulseTrace.slice(0, 4).map((item) => item.reason)
            ])),
            runtimeSegments: input.traversalSegments && input.traversalSegments.length > 0
                ? input.traversalSegments
                : [
                    { stage: 'entity', label: input.entityIds[0] ? `entity:${input.entityIds[0]}` : 'entity:none', count: input.entityIds.length },
                    { stage: 'temporal', label: input.temporalLabels[0] || 'temporal:none', count: input.temporalLabels.length },
                    { stage: 'branch', label: input.branchIds[0] ? `branch:${input.branchIds[0]}` : 'branch:none', count: input.branchIds.length },
                    { stage: 'dense', label: 'dense_joint_search', count: input.denseJointCount || 0 }
                ]
        };
    }
}
