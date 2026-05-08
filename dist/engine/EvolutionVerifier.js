import { NeuronFactory } from '../core/Neuron.js';
export class EvolutionVerifier {
    skillMemoryStore;
    proposalLedger;
    auditLedger;
    options;
    constructor(skillMemoryStore, proposalLedger, auditLedger, options = {}) {
        this.skillMemoryStore = skillMemoryStore;
        this.proposalLedger = proposalLedger;
        this.auditLedger = auditLedger;
        this.options = options;
    }
    async verify(projectId) {
        const result = await this.verifyPending(projectId);
        return result.verified;
    }
    async verifyPending(projectId) {
        const minSamplesAfter = this.options.minSamplesAfter ?? 10;
        const verifyDelayMs = this.options.minVerificationDelayMs ?? this.options.verifyDelayMs ?? 24 * 60 * 60 * 1000;
        const maxVerifyPerRun = this.options.maxVerifyPerRun ?? 10;
        let verified = 0;
        let skipped = 0;
        for (const auditEntry of this.auditLedger.getPendingVerificationEntries(projectId)) {
            if (verified >= maxVerifyPerRun)
                break;
            const proposal = this.proposalLedger.get(auditEntry.proposalId);
            if (!proposal || proposal.status !== 'applied')
                continue;
            if (!proposal.predictedImpact || proposal.actualOutcomeVerifiedAt)
                continue;
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
    verifyProposal(proposal, projectId, minSamplesAfter) {
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
    stats(tags, options) {
        if (typeof this.skillMemoryStore.getExecutionStatsForTags === 'function') {
            return this.skillMemoryStore.getExecutionStatsForTags(tags, options);
        }
        const stats = {};
        for (const tag of tags) {
            const matching = this.skillMemoryStore.listAll().filter((neuron) => (neuron.metadata.skillMeta?.intentTags || []).includes(tag));
            const samples = matching.reduce((sum, neuron) => sum + (neuron.metadata.skillMeta?.executionCount || 0), 0);
            const successes = matching.reduce((sum, neuron) => sum + (neuron.metadata.skillMeta?.successCount || 0), 0);
            stats[tag] = { samples, successRate: samples > 0 ? successes / samples : 0 };
        }
        return stats;
    }
    writeRegressionObservation(projectId, skillId, result) {
        const memoryGraph = this.options.memoryGraph;
        if (!memoryGraph)
            return;
        const content = `Evolution verification completed for ${skillId}: ${result.verdict}`;
        const now = Date.now();
        memoryGraph.addNeuron(NeuronFactory.create(content, memoryGraph.getLatestNeuronSelfHash(projectId) || 'genesis', { T: now, S: [0, 0, 0], V: [] }, {
            projectId,
            type: 'agent_observation',
            createdAt: now,
            updatedAt: now,
            status: 'active',
            tags: ['evolution_verification', result.verdict, skillId],
            sourceType: 'verified_fact',
            importanceLevel: 'important',
            aaak_summary: content
        }));
    }
}
function collectRates(tags, before, after) {
    const result = {};
    for (const tag of tags)
        result[tag] = { before: before[tag]?.successRate ?? 0, after: after[tag]?.successRate ?? 0 };
    return result;
}
