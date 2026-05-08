import { SupersedeChain } from './SupersedeChain.js';
export class MemoryExplain {
    db;
    scorer;
    decay;
    chain;
    constructor(db, scorer, decay) {
        this.db = db;
        this.scorer = scorer;
        this.decay = decay;
        this.chain = new SupersedeChain(db);
    }
    explainRecall(params) {
        return {
            included: params.recalled.map((fact) => {
                const credibilityScore = this.scorer.score(fact.sourceType || '');
                const lastAccessedAt = fact.lastAccessedAt ?? Date.now();
                const weight = this.decay.computeWeight({ lastAccessedAt, now: Date.now() });
                return {
                    factId: fact.factId,
                    reason: `matched query "${params.query}" and passed governance filters`,
                    credibilityScore,
                    weight
                };
            }),
            excluded: params.excluded.map((fact) => ({
                factId: fact.factId,
                reason: fact.reason
            }))
        };
    }
    explainFact(factId) {
        const row = this.db.prepare(`
      SELECT fact_id, valid_from, metadata_json
      FROM facts
      WHERE fact_id = ?
    `).get(factId);
        if (!row)
            return null;
        const metadata = row.metadata_json ? JSON.parse(row.metadata_json) : {};
        const sourceType = typeof metadata.sourceType === 'string' ? metadata.sourceType : undefined;
        const evidenceCount = typeof metadata.evidenceCount === 'number' ? metadata.evidenceCount : undefined;
        const lastAccessedAt = this.chain.getLastAccessedAt(factId);
        const status = this.chain.getStatus(factId)?.status ?? 'canonical';
        return {
            factId,
            credibilityScore: this.scorer.scoreForFact({
                sourceType,
                evidenceCount,
                recencyMs: Math.max(0, Date.now() - row.valid_from)
            }),
            currentWeight: this.decay.computeWeight({
                lastAccessedAt: lastAccessedAt ?? row.valid_from,
                now: Date.now()
            }),
            status,
            supersedeChain: this.chain.getChain(factId),
            lastAccessedAt,
            sourceType
        };
    }
}
