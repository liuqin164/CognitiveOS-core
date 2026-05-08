export class SkillDiscoveryTool {
    engine;
    constructor(engine) {
        this.engine = engine;
    }
    execute(input) {
        return {
            candidates: this.engine.findCandidates(input.query, input.projectId, input.limit ?? 5)
        };
    }
}
