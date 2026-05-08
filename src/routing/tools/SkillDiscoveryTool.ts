import type { ISkillDiscovery } from '../../types/ExtensionPoints.js';

export class SkillDiscoveryTool {
  constructor(private readonly engine: ISkillDiscovery) {}

  execute(input: { query: string; limit?: number; projectId?: string }) {
    return {
      candidates: this.engine.findCandidates(input.query, input.projectId, input.limit ?? 5)
    };
  }
}

