/**
 * SecondaryRecallTool.ts
 * brain_recall tool — re-runs BrainRecall with a new query.
 * Phase 48 — v1.1
 */
export class SecondaryRecallTool {
    recallFn;
    constructor(recallFn) {
        this.recallFn = recallFn;
    }
    async execute(input) {
        const limit = Math.min(input.limit ?? 6, 20); // SI-16: max 20 facts
        const result = await this.recallFn(input.query, {
            entityHint: input.entityHint,
            limit,
            projectId: input.projectId,
            topicPath: input.topicPath,
        });
        const facts = result.compiledMemory.facts.slice(0, 20); // SI-16 guard
        const events = result.compiledMemory.events.slice(0, 20);
        const summaries = (result.summaries || []).slice(0, 3);
        return {
            facts,
            events,
            summaries,
            strategy: result.strategy.primaryLevel,
            totalHits: facts.length + events.length + summaries.length,
        };
    }
}
