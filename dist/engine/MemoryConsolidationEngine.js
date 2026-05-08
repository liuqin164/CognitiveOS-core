export class MemoryConsolidationEngine {
    trigger;
    distiller;
    constructor(trigger, distiller) {
        this.trigger = trigger;
        this.distiller = distiller;
    }
    async run(projectId) {
        let semanticNeuronsCreated = 0;
        for (const candidate of this.trigger.findCandidates(projectId)) {
            const result = await this.distiller.distill({
                projectId,
                episodicNeuronIds: candidate.episodicNeuronIds,
                topicPath: candidate.topicPath
            });
            if (result)
                semanticNeuronsCreated += 1;
        }
        return { semanticNeuronsCreated };
    }
}
