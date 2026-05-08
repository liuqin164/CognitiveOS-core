import type { ConsolidationTrigger } from './ConsolidationTrigger.js';
import type { EpisodicSemanticDistiller } from './EpisodicSemanticDistiller.js';

export class MemoryConsolidationEngine {
  constructor(
    private readonly trigger: ConsolidationTrigger,
    private readonly distiller: EpisodicSemanticDistiller
  ) {}

  async run(projectId: string): Promise<{ semanticNeuronsCreated: number }> {
    let semanticNeuronsCreated = 0;
    for (const candidate of this.trigger.findCandidates(projectId)) {
      const result = await this.distiller.distill({
        projectId,
        episodicNeuronIds: candidate.episodicNeuronIds,
        topicPath: candidate.topicPath
      });
      if (result) semanticNeuronsCreated += 1;
    }
    return { semanticNeuronsCreated };
  }
}
