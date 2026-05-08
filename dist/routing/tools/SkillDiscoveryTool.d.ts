import type { ISkillDiscovery } from '../../types/ExtensionPoints.js';
export declare class SkillDiscoveryTool {
    private readonly engine;
    constructor(engine: ISkillDiscovery);
    execute(input: {
        query: string;
        limit?: number;
        projectId?: string;
    }): {
        candidates: import("../../types/ExtensionPoints.js").SkillCandidateLike[];
    };
}
//# sourceMappingURL=SkillDiscoveryTool.d.ts.map