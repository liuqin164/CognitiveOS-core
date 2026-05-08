import type { ConsolidationTrigger } from './ConsolidationTrigger.js';
import type { EpisodicSemanticDistiller } from './EpisodicSemanticDistiller.js';
export declare class MemoryConsolidationEngine {
    private readonly trigger;
    private readonly distiller;
    constructor(trigger: ConsolidationTrigger, distiller: EpisodicSemanticDistiller);
    run(projectId: string): Promise<{
        semanticNeuronsCreated: number;
    }>;
}
//# sourceMappingURL=MemoryConsolidationEngine.d.ts.map