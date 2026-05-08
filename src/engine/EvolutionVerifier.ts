import type { ProposalLedger } from '../meta/ProposalLedger.js';
import type { EvolutionVerificationResult, PolicyProposal } from '../meta/types.js';
import { NeuronFactory } from '../core/Neuron.js';
import type { MemoryGraph } from '../core/MemoryGraph.js';
import type { IAuditLedger } from '../types/ExtensionPoints.js';
import type { ISkillMemoryStore } from '../types/ExtensionPoints.js';

export interface EvolutionVerifierOptions {
  minSamplesAfter?: number;
  verifyDelayMs?: number;
  minVerificationDelayMs?: number;
  maxVerifyPerRun?: number;
  memoryGraph?: MemoryGraph;
}

interface TagStats {
  samples: number;
  successRate: number;
}

type StatsCapableSkillStore = ISkillMemoryStore & {
  getExecutionStatsForTags?: (tags: string[], options: { before?: number; after?: number; projectId?: string }) => Record<string, TagStats>;
};

export class EvolutionVerifier {
  constructor(
    private readonly skillMemoryStore: StatsCapableSkillStore,
    private readonly proposalLedger: ProposalLedger,
    private readonly auditLedger: IAuditLedger,
    private readonly options: EvolutionVerifierOptions = {}
  ) {}

  async verify(projectId: string): Promise<number> {
    const result = await this.verifyPending(projectId);
    return result.verified;
  }

  async verifyPending(projectId: string): Promise<{ verified: number; skipped: number }> {
    const minSamplesAfter = this.options.minSamplesAfter ?? 10;
    const verifyDelayMs = this.options.minVerificationDelayMs ?? this.options.verifyDelayMs ?? 24 * 60 * 60 * 1000;
    const maxVerifyPerRun = this.options.maxVerifyPerRun ?? 10;
    let verified = 0;
    let skipped = 0;
    for (const auditEntry of this.auditLedger.getPendingVerificationEntries(projectId)) {
      if (verified >= maxVerifyPerRun) break;
      const proposal = this.proposalLedger.get(auditEntry.proposalId);
      if (!proposal || proposal.status !== 'applied') continue;
      if (!proposal.predictedImpact || proposal.actualOutcomeVerifiedAt) continue;
      if ((proposal.appliedAt ?? proposal.proposedAt) + verifyDelayMs > Date.now()) {
        skipped += 1;
        continue;
      }
      const result = this.verifyProposal(proposal, projectId, minSamplesAfter);
      this.proposalLedger.updateStatus(proposal.id, 'applied', {
        actualOutcomeVerifiedAt: result.verifiedAt,
        verificationResult: result
      });
      this.auditLedger.updateVerificationResult(proposal.id, result);
      this.writeRegressionObservation(projectId, auditEntry.skillId, result);
      verified += 1;
    }
    return { verified, skipped };
  }

  private verifyProposal(proposal: PolicyProposal, projectId: string, minSamplesAfter: number): EvolutionVerificationResult {
    const tags = Array.from(new Set([
      ...(proposal.predictedImpact?.improvedTags || []),
      ...(proposal.predictedImpact?.potentialRegressionTags || [])
    ]));
    const beforeStats = this.stats(tags, { before: proposal.appliedAt ?? proposal.proposedAt, projectId });
    const afterStats = this.stats(tags, { after: proposal.appliedAt ?? proposal.proposedAt, projectId });
    const improvedTagsActual = collectRates(proposal.predictedImpact?.improvedTags || [], beforeStats, afterStats);
    const regressionTagsActual = collectRates(proposal.predictedImpact?.potentialRegressionTags || [], beforeStats, afterStats);
    const afterSamples = Object.values(afterStats).reduce((sum, stat) => sum + stat.samples, 0);
    const regression = Object.values(regressionTagsActual).some((rate) => rate.before - rate.after > 0.1);
    const improved = Object.values(improvedTagsActual).filter((rate) => rate.after > rate.before);
    const verdict = afterSamples < minSamplesAfter
      ? 'insufficient_data'
      : regression
        ? 'regressed'
        : improved.length === Object.keys(improvedTagsActual).length
          ? 'confirmed'
          : 'partial';
    return { verifiedAt: Date.now(), improvedTagsActual, regressionTagsActual, verdict };
  }

  private stats(tags: string[], options: { before?: number; after?: number; projectId?: string }): Record<string, TagStats> {
    if (typeof this.skillMemoryStore.getExecutionStatsForTags === 'function') {
      return this.skillMemoryStore.getExecutionStatsForTags(tags, options);
    }
    const stats: Record<string, TagStats> = {};
    for (const tag of tags) {
      const matching = this.skillMemoryStore.listAll().filter((neuron) => (neuron.metadata.skillMeta?.intentTags || []).includes(tag));
      const samples = matching.reduce((sum, neuron) => sum + (neuron.metadata.skillMeta?.executionCount || 0), 0);
      const successes = matching.reduce((sum, neuron) => sum + (neuron.metadata.skillMeta?.successCount || 0), 0);
      stats[tag] = { samples, successRate: samples > 0 ? successes / samples : 0 };
    }
    return stats;
  }

  private writeRegressionObservation(projectId: string, skillId: string, result: EvolutionVerificationResult): void {
    const memoryGraph = this.options.memoryGraph;
    if (!memoryGraph) return;
    const content = `Evolution verification completed for ${skillId}: ${result.verdict}`;
    const now = Date.now();
    memoryGraph.addNeuron(NeuronFactory.create(
      content,
      memoryGraph.getLatestNeuronSelfHash(projectId) || 'genesis',
      { T: now, S: [0, 0, 0], V: [] },
      {
        projectId,
        type: 'agent_observation',
        createdAt: now,
        updatedAt: now,
        status: 'active',
        tags: ['evolution_verification', result.verdict, skillId],
        sourceType: 'verified_fact',
        importanceLevel: 'important',
        aaak_summary: content
      }
    ));
  }
}

function collectRates(tags: string[], before: Record<string, TagStats>, after: Record<string, TagStats>): Record<string, { before: number; after: number }> {
  const result: Record<string, { before: number; after: number }> = {};
  for (const tag of tags) result[tag] = { before: before[tag]?.successRate ?? 0, after: after[tag]?.successRate ?? 0 };
  return result;
}
