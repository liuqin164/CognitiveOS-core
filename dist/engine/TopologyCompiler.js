import { randomUUID } from 'crypto';
export class TopologyCompiler {
    store;
    constructor(store) {
        this.store = store;
    }
    compile(input) {
        const { neuron, consolidation } = input;
        const projectId = neuron.metadata.projectId;
        const createdAt = neuron.metadata.createdAt;
        const ref = {
            neuronId: neuron.id,
            unitId: consolidation.interactionUnit?.unitId,
            createdAt
        };
        const timeBuckets = this.attachTimeBuckets(createdAt, projectId, ref);
        const branchIds = projectId ? this.attachProjectBranches(projectId, neuron, consolidation, ref) : [];
        const taskIds = this.attachTaskBranches(projectId, neuron, consolidation, ref);
        const clusterIds = this.attachEventClusters(projectId, neuron, consolidation, ref);
        return { timeBuckets, branchIds, taskIds, clusterIds };
    }
    attachTimeBuckets(createdAt, projectId, ref) {
        const buckets = [
            this.buildBucket('day', createdAt),
            this.buildBucket('week', createdAt),
            this.buildBucket('month', createdAt)
        ];
        for (const bucket of buckets) {
            this.store.upsertTimeBucket(bucket);
            this.store.attachToTimeBucket(bucket.bucketId, {
                ...ref,
                projectId
            });
        }
        return buckets;
    }
    attachProjectBranches(projectId, neuron, consolidation, ref) {
        const createdAt = ref.createdAt;
        const branchIds = [];
        const root = this.store.upsertProjectBranch({
            branchId: `pbranch-${randomUUID()}`,
            projectId,
            branchKey: `project:${projectId}`,
            branchKind: 'project_root',
            title: projectId,
            createdAt
        });
        this.store.attachToBranch(root.branchId, ref);
        branchIds.push(root.branchId);
        if (consolidation.interactionUnit) {
            const interactionBranch = this.store.upsertProjectBranch({
                branchId: `pbranch-${randomUUID()}`,
                projectId,
                branchKey: `interaction:${consolidation.interactionUnit.unitId}`,
                branchKind: 'interaction',
                title: consolidation.interactionUnit.semanticText,
                createdAt
            });
            this.store.linkBranches(root.branchId, interactionBranch.branchId, 'contains', createdAt);
            this.store.attachToBranch(interactionBranch.branchId, ref);
            branchIds.push(interactionBranch.branchId);
        }
        for (const belief of consolidation.beliefs) {
            const branch = this.store.upsertProjectBranch({
                branchId: `pbranch-${randomUUID()}`,
                projectId,
                branchKey: `belief:${belief.canonicalKey}`,
                branchKind: 'belief',
                title: `${belief.subject} ${belief.predicate}=${belief.objectValue.raw}`,
                createdAt
            });
            this.store.linkBranches(root.branchId, branch.branchId, 'contains', createdAt);
            this.store.attachToBranch(branch.branchId, {
                ...ref,
                beliefId: belief.id
            });
            branchIds.push(branch.branchId);
        }
        for (const fact of consolidation.compiledFacts) {
            const branch = this.store.upsertProjectBranch({
                branchId: `pbranch-${randomUUID()}`,
                projectId,
                branchKey: `fact:${fact.subject}:${fact.predicateFamily}:${fact.object || fact.predicateValue || 'unknown'}`,
                branchKind: 'fact',
                title: `${fact.subject} ${fact.predicateFamily} ${fact.object || fact.predicateValue || ''}`.trim(),
                createdAt
            });
            this.store.linkBranches(root.branchId, branch.branchId, 'contains', createdAt);
            this.store.attachToBranch(branch.branchId, {
                ...ref,
                factId: fact.factId
            });
            branchIds.push(branch.branchId);
        }
        for (const event of consolidation.compiledEvents) {
            const branch = this.store.upsertProjectBranch({
                branchId: `pbranch-${randomUUID()}`,
                projectId,
                branchKey: `event:${event.eventType}:${event.target || event.actor || 'unknown'}`,
                branchKind: 'event',
                title: `${event.eventType}:${event.target || event.actor || 'event'}`,
                createdAt
            });
            this.store.linkBranches(root.branchId, branch.branchId, 'contains', createdAt);
            this.store.attachToBranch(branch.branchId, {
                ...ref,
                eventId: event.eventId
            });
            branchIds.push(branch.branchId);
        }
        if (this.looksLikeTaskCarrier(neuron.content, consolidation.beliefs)) {
            const taskBranch = this.store.upsertProjectBranch({
                branchId: `pbranch-${randomUUID()}`,
                projectId,
                branchKey: `task:${this.normalizeKey(neuron.content).slice(0, 72)}`,
                branchKind: 'task',
                title: neuron.content.slice(0, 96),
                createdAt
            });
            this.store.linkBranches(root.branchId, taskBranch.branchId, 'contains', createdAt);
            this.store.attachToBranch(taskBranch.branchId, ref);
            branchIds.push(taskBranch.branchId);
        }
        return branchIds;
    }
    attachTaskBranches(projectId, neuron, consolidation, ref) {
        const taskIds = [];
        const createdAt = ref.createdAt;
        const taskTitles = new Set();
        for (const fact of consolidation.compiledFacts) {
            if (fact.predicateFamily === 'worked_on' && fact.object)
                taskTitles.add(fact.object);
            if (fact.predicateFamily === 'has_issue' && fact.object)
                taskTitles.add(`issue:${fact.object}`);
        }
        for (const belief of consolidation.beliefs) {
            if (belief.predicate.startsWith('workflow.') || belief.predicate.startsWith('decision.')) {
                taskTitles.add(belief.predicate);
            }
        }
        if (consolidation.interactionUnit?.type === 'proposal') {
            taskTitles.add(consolidation.interactionUnit.semanticText);
        }
        for (const title of taskTitles) {
            const task = this.store.upsertTaskBranch({
                taskId: `task-${randomUUID()}`,
                projectId,
                taskKey: `${projectId || 'global'}:${this.normalizeKey(title)}`,
                title,
                status: 'derived',
                createdAt
            });
            this.store.attachToTask(task.taskId, ref);
            for (const fact of consolidation.compiledFacts) {
                this.store.attachToTask(task.taskId, { factId: fact.factId, createdAt });
            }
            for (const belief of consolidation.beliefs) {
                this.store.attachToTask(task.taskId, { beliefId: belief.id, createdAt });
            }
            taskIds.push(task.taskId);
        }
        return taskIds;
    }
    attachEventClusters(projectId, neuron, consolidation, ref) {
        const clusterIds = [];
        const createdAt = ref.createdAt;
        for (const event of consolidation.compiledEvents) {
            const clusterType = this.toClusterType(event.eventType);
            const cluster = this.store.upsertEventCluster({
                clusterId: `cluster-${randomUUID()}`,
                projectId,
                clusterKey: `${projectId || 'global'}:${clusterType}:${this.normalizeKey(event.target || event.actor || event.eventType)}`,
                clusterType,
                title: event.target || event.actor || event.eventType,
                createdAt
            });
            this.store.attachToEventCluster(cluster.clusterId, {
                ...ref,
                eventId: event.eventId
            });
            clusterIds.push(cluster.clusterId);
        }
        for (const fact of consolidation.compiledFacts) {
            if (fact.predicateFamily !== 'has_issue' && fact.predicateFamily !== 'worked_on')
                continue;
            const clusterType = fact.predicateFamily === 'has_issue' ? 'issue' : 'project';
            const cluster = this.store.upsertEventCluster({
                clusterId: `cluster-${randomUUID()}`,
                projectId,
                clusterKey: `${projectId || 'global'}:${clusterType}:${this.normalizeKey(fact.object || fact.predicateValue || fact.subject)}`,
                clusterType,
                title: fact.object || fact.predicateValue || fact.subject,
                createdAt
            });
            this.store.attachToEventCluster(cluster.clusterId, {
                ...ref,
                factId: fact.factId
            });
            clusterIds.push(cluster.clusterId);
        }
        for (const belief of consolidation.beliefs) {
            if (!belief.predicate.startsWith('decision.'))
                continue;
            const cluster = this.store.upsertEventCluster({
                clusterId: `cluster-${randomUUID()}`,
                projectId,
                clusterKey: `${projectId || 'global'}:fact:${this.normalizeKey(belief.predicate)}`,
                clusterType: 'fact',
                title: belief.predicate,
                createdAt
            });
            this.store.attachToEventCluster(cluster.clusterId, {
                ...ref,
                beliefId: belief.id
            });
            clusterIds.push(cluster.clusterId);
        }
        if (clusterIds.length === 0 && this.looksLikeTaskCarrier(neuron.content, consolidation.beliefs)) {
            const cluster = this.store.upsertEventCluster({
                clusterId: `cluster-${randomUUID()}`,
                projectId,
                clusterKey: `${projectId || 'global'}:generic:${this.normalizeKey(neuron.content).slice(0, 72)}`,
                clusterType: 'generic',
                title: neuron.content.slice(0, 96),
                createdAt
            });
            this.store.attachToEventCluster(cluster.clusterId, ref);
            clusterIds.push(cluster.clusterId);
        }
        return clusterIds;
    }
    buildBucket(bucketType, timestamp) {
        const date = new Date(timestamp);
        let start;
        let end;
        let label;
        if (bucketType === 'day') {
            start = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
            end = start + 24 * 60 * 60 * 1000;
            label = new Date(start).toISOString().slice(0, 10);
        }
        else if (bucketType === 'week') {
            const day = date.getDay();
            const diff = (day + 6) % 7;
            start = new Date(date.getFullYear(), date.getMonth(), date.getDate() - diff).getTime();
            end = start + 7 * 24 * 60 * 60 * 1000;
            label = `week:${new Date(start).toISOString().slice(0, 10)}`;
        }
        else {
            start = new Date(date.getFullYear(), date.getMonth(), 1).getTime();
            end = new Date(date.getFullYear(), date.getMonth() + 1, 1).getTime();
            label = new Date(start).toISOString().slice(0, 7);
        }
        return {
            bucketId: `${bucketType}:${start}`,
            bucketType,
            bucketStart: start,
            bucketEnd: end,
            label
        };
    }
    looksLikeTaskCarrier(content, beliefs) {
        return /项目|project|修复|fix|实现|implement|计划|plan|任务|task|workflow|步骤|step/i.test(content)
            || beliefs.some((belief) => belief.predicate.startsWith('workflow.') || belief.predicate.startsWith('decision.'));
    }
    toClusterType(eventType) {
        if (/approved/i.test(eventType))
            return 'approval';
        if (/rejected/i.test(eventType))
            return 'rejection';
        return 'generic';
    }
    normalizeKey(value) {
        return value.trim().toLowerCase().replace(/[^\p{L}\p{N}._-]+/gu, '_').replace(/^_+|_+$/g, '');
    }
}
