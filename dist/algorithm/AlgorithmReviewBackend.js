import { extractExplicitNamedEntityCandidate, extractIssueHints, inferIssueValue, normalizeLexiconText } from '../lexicon/coreMemoryLexicon.js';
export const PHASE1_RULE_REVIEW_VERSION = 'phase1_rule_v1';
export const MODEL_BACKED_PHASE2_REVIEW_VERSION = 'model_backed_phase2_v1';
export function buildAlgorithmReviewMetadata(input) {
    const metadata = {
        ...(input.metadata || {}),
        ...(input.provenance ? { provenance: input.provenance } : {}),
        reviewBackendMode: input.reviewBackendMode,
        reviewVersion: input.reviewVersion,
        reviewKind: input.reviewKind,
        algorithm_review_kind: input.reviewKind,
        algorithm_review_backend_mode: input.reviewBackendMode,
        algorithm_review_version: input.reviewVersion
    };
    return input.reviewFallbackFrom
        ? {
            ...metadata,
            reviewFallbackFrom: input.reviewFallbackFrom,
            algorithm_review_fallback_from: input.reviewFallbackFrom
        }
        : metadata;
}
export class NoopAlgorithmReviewBackend {
    reviewProvisionalFactCandidates() {
        return {
            adjudications: [],
            aliasMergeSuggestions: []
        };
    }
    reviewSelfCorrectionCandidates() {
        return {
            suggestedFacts: []
        };
    }
    reviewMultiFactExtractionCandidates() {
        return {
            suggestedEntities: [],
            suggestedFacts: []
        };
    }
}
export class Phase1RuleAlgorithmReviewBackend {
    reviewProvisionalFactCandidates(input) {
        const adjudications = [];
        const aliasMergeSuggestions = [];
        const factById = new Map(input.facts.map((fact) => [fact.factId, fact]));
        const preferenceGroups = new Map();
        for (const fact of input.facts) {
            if (fact.predicateFamily !== 'likes' && fact.predicateFamily !== 'dislikes')
                continue;
            const key = `${fact.subject}|${normalizeLexiconText(fact.object || '').toLowerCase()}`;
            const bucket = preferenceGroups.get(key) || [];
            bucket.push(fact);
            preferenceGroups.set(key, bucket);
        }
        for (const facts of preferenceGroups.values()) {
            if (facts.length < 2)
                continue;
            facts.sort((a, b) => b.validFrom - a.validFrom || b.confidence - a.confidence);
            const latest = facts[0];
            adjudications.push({
                factId: latest.factId,
                action: 'verify',
                reason: 'latest_preference_state_adjudicated_phase1',
                confidence: Math.max(latest.confidence, 0.9),
                metadata: buildAlgorithmReviewMetadata({
                    reviewBackendMode: 'phase1_rule',
                    reviewVersion: PHASE1_RULE_REVIEW_VERSION,
                    reviewKind: 'preference_conflict_resolution',
                    provenance: 'algorithm_review_phase1'
                })
            });
            for (const older of facts.slice(1)) {
                adjudications.push({
                    factId: older.factId,
                    action: 'supersede',
                    reason: 'older_preference_state_superseded_phase1',
                    supersededByFactId: latest.factId,
                    metadata: buildAlgorithmReviewMetadata({
                        reviewBackendMode: 'phase1_rule',
                        reviewVersion: PHASE1_RULE_REVIEW_VERSION,
                        reviewKind: 'preference_conflict_resolution',
                        provenance: 'algorithm_review_phase1'
                    })
                });
            }
        }
        for (const fact of input.facts) {
            const correctionBasisId = typeof fact.metadata?.correction_basis === 'string'
                ? fact.metadata.correction_basis
                : typeof fact.metadata?.correctionBasisFactId === 'string'
                    ? fact.metadata.correctionBasisFactId
                    : undefined;
            if (!correctionBasisId)
                continue;
            const correctionBasis = factById.get(correctionBasisId);
            if (correctionBasis) {
                adjudications.push({
                    factId: fact.factId,
                    action: 'verify',
                    reason: 'self_correction_verified_phase1',
                    confidence: Math.max(fact.confidence, 0.86),
                    metadata: buildAlgorithmReviewMetadata({
                        reviewBackendMode: 'phase1_rule',
                        reviewVersion: PHASE1_RULE_REVIEW_VERSION,
                        reviewKind: 'self_correction_repair',
                        provenance: 'algorithm_review_phase1'
                    })
                });
                adjudications.push({
                    factId: correctionBasis.factId,
                    action: 'supersede',
                    reason: 'self_correction_basis_superseded_phase1',
                    supersededByFactId: fact.factId,
                    metadata: buildAlgorithmReviewMetadata({
                        reviewBackendMode: 'phase1_rule',
                        reviewVersion: PHASE1_RULE_REVIEW_VERSION,
                        reviewKind: 'self_correction_repair',
                        provenance: 'algorithm_review_phase1'
                    })
                });
            }
        }
        const canonicalKey = (entity) => {
            return normalizeLexiconText(entity.canonicalName)
                .replace(/[^a-z0-9\u4e00-\u9fff]+/gi, '')
                .toLowerCase();
        };
        const entityGroups = new Map();
        for (const entity of input.entities) {
            if (entity.status === 'archived')
                continue;
            const aliases = new Set([canonicalKey(entity), ...entity.aliases.map((alias) => normalizeLexiconText(alias).replace(/[^a-z0-9\u4e00-\u9fff]+/gi, '').toLowerCase())]);
            for (const alias of aliases) {
                if (!alias)
                    continue;
                const bucket = entityGroups.get(`${entity.type}|${alias}`) || [];
                bucket.push(entity);
                entityGroups.set(`${entity.type}|${alias}`, bucket);
            }
        }
        for (const entities of entityGroups.values()) {
            const unique = Array.from(new Map(entities.map((entity) => [entity.entityId, entity])).values());
            if (unique.length < 2)
                continue;
            unique.sort((a, b) => b.updatedAt - a.updatedAt || b.createdAt - a.createdAt);
            const primary = unique[0];
            for (const duplicate of unique.slice(1)) {
                aliasMergeSuggestions.push({
                    primaryEntityId: primary.entityId,
                    duplicateEntityId: duplicate.entityId,
                    reason: 'alias_overlap_merge_suggestion_phase1'
                });
            }
        }
        return {
            adjudications,
            aliasMergeSuggestions
        };
    }
    reviewSelfCorrectionCandidates(input) {
        const suggestedFacts = [];
        for (const episode of input.rawEpisodes) {
            const normalized = normalizeLexiconText(episode.content);
            if (!/(不对|不是|更正|改口)/.test(normalized) || !/(左耳|右耳)/.test(normalized))
                continue;
            const correctedSide = normalized.includes('右耳') ? '右耳' : normalized.includes('左耳') ? '左耳' : '';
            if (!correctedSide)
                continue;
            const relatedFact = [...input.facts]
                .filter((fact) => fact.predicateFamily === 'has_issue' && fact.validFrom <= episode.metadata.createdAt)
                .sort((a, b) => b.validFrom - a.validFrom || b.confidence - a.confidence)[0];
            if (!relatedFact)
                continue;
            const baseIssue = inferIssueValue(relatedFact.predicateValue || relatedFact.sourceText) || '异常';
            const normalizedIssue = baseIssue.startsWith(correctedSide) ? baseIssue : `${correctedSide}${baseIssue}`;
            suggestedFacts.push({
                neuronId: episode.id,
                subject: 'device',
                predicateFamily: 'has_issue',
                predicateValue: normalizedIssue,
                object: relatedFact.object || 'device',
                entityId: relatedFact.entityId,
                validFrom: episode.metadata.createdAt,
                certaintyLevel: 'probable',
                confidence: 0.84,
                status: 'provisional_enriched',
                sourceText: episode.content,
                metadata: buildAlgorithmReviewMetadata({
                    reviewBackendMode: 'phase1_rule',
                    reviewVersion: PHASE1_RULE_REVIEW_VERSION,
                    reviewKind: 'self_correction_repair',
                    provenance: 'algorithm_review_phase1',
                    metadata: {
                        correction_basis: relatedFact.factId
                    }
                })
            });
        }
        return { suggestedFacts };
    }
    reviewMultiFactExtractionCandidates(input) {
        const suggestedEntities = [];
        const suggestedFacts = [];
        for (const episode of input.rawEpisodes) {
            const normalized = normalizeLexiconText(episode.content);
            const existingFacts = input.facts.filter((fact) => fact.neuronId === episode.id && fact.predicateFamily === 'has_issue');
            const existingIssues = new Set(existingFacts.map((fact) => normalizeLexiconText(fact.predicateValue || '').toLowerCase()));
            const hints = extractIssueHints(normalized)
                .map((hint) => inferIssueValue(hint) || hint)
                .filter((issue) => Boolean(issue));
            if (hints.length <= existingFacts.length)
                continue;
            const explicitEntity = extractExplicitNamedEntityCandidate(normalized);
            const currentObject = existingFacts[0]?.object || explicitEntity || 'device';
            if (explicitEntity && !input.entities.some((entity) => entity.canonicalName.toLowerCase() === explicitEntity.toLowerCase())) {
                suggestedEntities.push({
                    canonicalName: explicitEntity,
                    type: 'device',
                    aliases: [explicitEntity],
                    metadata: buildAlgorithmReviewMetadata({
                        reviewBackendMode: 'phase1_rule',
                        reviewVersion: PHASE1_RULE_REVIEW_VERSION,
                        reviewKind: 'explicit_entity_wording_repair',
                        provenance: 'algorithm_review_phase1'
                    }),
                    instanceMode: 'new_instance'
                });
            }
            for (const issue of hints) {
                const normalizedIssue = normalizeLexiconText(issue).toLowerCase();
                if (!normalizedIssue || existingIssues.has(normalizedIssue))
                    continue;
                existingIssues.add(normalizedIssue);
                suggestedFacts.push({
                    neuronId: episode.id,
                    subject: 'device',
                    predicateFamily: 'has_issue',
                    predicateValue: issue,
                    object: currentObject,
                    entityId: existingFacts[0]?.entityId,
                    validFrom: episode.metadata.createdAt,
                    certaintyLevel: input.mode === 'offline' ? 'probable' : 'possible',
                    confidence: input.mode === 'offline' ? 0.8 : 0.76,
                    status: 'provisional_enriched',
                    sourceText: episode.content,
                    metadata: buildAlgorithmReviewMetadata({
                        reviewBackendMode: 'phase1_rule',
                        reviewVersion: PHASE1_RULE_REVIEW_VERSION,
                        reviewKind: 'multi_fact_repair',
                        provenance: 'algorithm_review_phase1'
                    })
                });
            }
        }
        return {
            suggestedEntities,
            suggestedFacts
        };
    }
}
