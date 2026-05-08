import type Database from 'bun:sqlite';
import { CredibilityScorer } from './CredibilityScorer.js';
import { DecayPolicy } from './DecayPolicy.js';
import { SupersedeChain, type SupersedeRecord } from './SupersedeChain.js';

export class MemoryExplain {
  private readonly chain: SupersedeChain;

  constructor(
    private db: Database,
    private scorer: CredibilityScorer,
    private decay: DecayPolicy
  ) {
    this.chain = new SupersedeChain(db);
  }

  explainRecall(params: {
    query: string;
    recalled: Array<{ factId: string; content: string; sourceType?: string; lastAccessedAt?: number }>;
    excluded: Array<{ factId: string; content: string; reason: 'decayed' | 'superseded' | 'low_credibility' }>;
  }): {
    included: Array<{ factId: string; reason: string; credibilityScore: number; weight: number }>;
    excluded: Array<{ factId: string; reason: string }>;
  } {
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

  explainFact(factId: string): {
    factId: string;
    credibilityScore: number;
    currentWeight: number;
    status: string;
    supersedeChain: SupersedeRecord[];
    lastAccessedAt?: number;
    sourceType?: string;
  } | null {
    const row = this.db.prepare(`
      SELECT fact_id, valid_from, metadata_json
      FROM facts
      WHERE fact_id = ?
    `).get(factId) as {
      fact_id: string;
      valid_from: number;
      metadata_json: string | null;
    } | null;

    if (!row) return null;

    const metadata = row.metadata_json ? JSON.parse(row.metadata_json) as Record<string, unknown> : {};
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
