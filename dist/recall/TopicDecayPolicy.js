import { normalizeTopicPath } from './HierarchicalRecallRouter.js';
const SUMMARY_TAG = 'topic_summary';
const DAY_MS = 24 * 60 * 60 * 1000;
export class TopicDecayPolicy {
    memoryGraph;
    options;
    constructor(memoryGraph, options = {}) {
        this.memoryGraph = memoryGraph;
        this.options = options;
    }
    findStalePaths(projectId) {
        const thresholdMs = Math.max(0, this.options.staleThresholdDays ?? 90) * DAY_MS;
        const minNeuronCount = Math.max(1, this.options.minNeuronCount ?? 5);
        const cutoff = Date.now() - thresholdMs;
        return this.memoryGraph.getTopicPaths(projectId)
            .map((path) => normalizeTopicPath(path))
            .filter((path) => Boolean(path))
            .filter((path) => {
            const neurons = this.getSourceNeurons(path, projectId);
            if (neurons.length < minNeuronCount)
                return false;
            const latestWrite = Math.max(...neurons.map((neuron) => neuron.metadata.createdAt));
            return latestWrite < cutoff;
        })
            .sort();
    }
    applyDecay(projectId) {
        const level = this.options.decayImportanceLevel ?? 'low';
        let decayed = 0;
        for (const path of this.findStalePaths(projectId)) {
            for (const neuron of this.getSourceNeurons(path, projectId)) {
                if (neuron.metadata.importanceLevel === level)
                    continue;
                this.memoryGraph.updateNeuronImportance(neuron.id, level, false);
                decayed += 1;
            }
        }
        return decayed;
    }
    getSourceNeurons(topicPath, projectId) {
        return this.memoryGraph.getNeuronIdsByTopicPrefix(topicPath, projectId)
            .map((id) => this.memoryGraph.getNeuron(id))
            .filter((neuron) => Boolean(neuron))
            .filter((neuron) => neuron.metadata.tags?.includes(SUMMARY_TAG) !== true);
    }
}
