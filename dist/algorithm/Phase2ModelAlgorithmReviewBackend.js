// @ts-nocheck
import { normalizeLexiconText } from '../lexicon/coreMemoryLexicon.js';
import { buildAlgorithmReviewMetadata, MODEL_BACKED_PHASE2_REVIEW_VERSION, NoopAlgorithmReviewBackend, Phase1RuleAlgorithmReviewBackend, PHASE1_RULE_REVIEW_VERSION } from './AlgorithmReviewBackend.js';
import { SemanticBackendRuntime } from '../backend/SemanticBackend.js';
import { ModelRegistry } from '../models/ModelRegistry.js';
import { createMemoryReviewAdapter } from '../models/adapters/MemoryReviewAdapter.js';
export function resolveAlgorithmReviewBackendMode() {
    return 'noop';
}
export function createAlgorithmReviewBackend(options = {}) {
    const registry = options.modelRegistry || ModelRegistry.defaults();
    if (!registry.isRuleOnly('memory')) {
        return createMemoryReviewAdapter(registry);
    }
    const mode = resolveAlgorithmReviewBackendMode();
    if (mode === 'phase1_rule')
        return new Phase1RuleAlgorithmReviewBackend();
    if (mode === 'model_backed_phase2') {
        return new Phase2ModelAlgorithmReviewBackend({
            semanticBackend: options.semanticBackend,
            modelRuntime: options.modelRuntime,
            fallbackBackend: options.fallbackBackend || new Phase1RuleAlgorithmReviewBackend()
        });
    }
    return new NoopAlgorithmReviewBackend();
}
export class Phase2ModelAlgorithmReviewBackend {
    options;
    semanticBackend;
    fallbackBackend;
    runtimePromise;
    constructor(options = {}) {
        this.options = options;
        this.semanticBackend = options.semanticBackend || new SemanticBackendRuntime();
        this.fallbackBackend = options.fallbackBackend || new Phase1RuleAlgorithmReviewBackend();
    }
    async reviewProvisionalFactCandidates(input) {
        const baseline = await this.fallbackBackend.reviewProvisionalFactCandidates(input);
        const runtime = await this.prepareRuntime('offline_deep_consolidation');
        if (!runtime)
            return this.annotateFallbackProvisional(baseline);
        const reviewed = await runtime.reviewProvisionalFactCandidates(input);
        return {
            adjudications: this.mergeAdjudications(baseline.adjudications, reviewed.adjudications || []),
            aliasMergeSuggestions: this.mergeAliasSuggestions(baseline.aliasMergeSuggestions, reviewed.aliasMergeSuggestions || [])
        };
    }
    async reviewSelfCorrectionCandidates(input) {
        const baseline = await this.fallbackBackend.reviewSelfCorrectionCandidates(input);
        const runtime = await this.prepareRuntime('optional_semantic_task');
        if (!runtime)
            return this.annotateFallbackSuggestedFacts(baseline);
        const reviewed = await runtime.reviewSelfCorrectionCandidates(input);
        return {
            suggestedFacts: this.mergeSuggestedFacts(baseline.suggestedFacts, reviewed.suggestedFacts || [], {
                defaultKind: 'model_backed_self_correction_repair'
            })
        };
    }
    async reviewMultiFactExtractionCandidates(input) {
        const baseline = await this.fallbackBackend.reviewMultiFactExtractionCandidates(input);
        const runtime = await this.prepareRuntime(input.mode === 'offline' ? 'offline_deep_consolidation' : 'async_low_confidence_enrichment');
        if (!runtime)
            return this.annotateFallbackMultiFact(baseline);
        const reviewed = await runtime.reviewMultiFactExtractionCandidates(input);
        return {
            suggestedEntities: this.mergeSuggestedEntities(baseline.suggestedEntities, reviewed.suggestedEntities || []),
            suggestedFacts: this.mergeSuggestedFacts(baseline.suggestedFacts, reviewed.suggestedFacts || [], {
                defaultKind: 'model_backed_multi_fact_repair'
            })
        };
    }
    async prepareRuntime(task) {
        const invocation = this.semanticBackend.prepare(task);
        if (invocation.selectedBackend === 'rule-only-fallback') {
            return null;
        }
        if (!this.runtimePromise) {
            this.runtimePromise = this.options.modelRuntime
                ? Promise.resolve(this.options.modelRuntime)
                : this.createDefaultRuntime();
        }
        return this.runtimePromise;
    }
    async createDefaultRuntime() {
        const status = this.semanticBackend.getStatus();
        if (!status.modelPath) {
            throw new Error('Phase2ModelAlgorithmReviewBackend requires a warmed local model path.');
        }
        return new GemmaPhase2LocalReviewRuntime(status.modelPath);
    }
    annotateFallbackProvisional(result) {
        return {
            adjudications: result.adjudications.map((item) => ({
                ...item,
                metadata: buildAlgorithmReviewMetadata({
                    reviewBackendMode: 'phase1_rule',
                    reviewVersion: PHASE1_RULE_REVIEW_VERSION,
                    reviewKind: `${item.metadata?.reviewKind || item.metadata?.algorithm_review_kind || 'provisional_fact_adjudication'}`,
                    reviewFallbackFrom: 'model_backed_phase2',
                    provenance: `${item.metadata?.provenance || 'algorithm_review_phase1'}`,
                    metadata: item.metadata
                })
            })),
            aliasMergeSuggestions: result.aliasMergeSuggestions
        };
    }
    annotateFallbackSuggestedFacts(result) {
        return {
            suggestedFacts: result.suggestedFacts.map((fact) => ({
                ...fact,
                metadata: buildAlgorithmReviewMetadata({
                    reviewBackendMode: 'phase1_rule',
                    reviewVersion: PHASE1_RULE_REVIEW_VERSION,
                    reviewKind: `${fact.metadata?.reviewKind || fact.metadata?.algorithm_review_kind || 'self_correction_repair'}`,
                    reviewFallbackFrom: 'model_backed_phase2',
                    provenance: `${fact.metadata?.provenance || 'algorithm_review_phase1'}`,
                    metadata: fact.metadata
                })
            }))
        };
    }
    annotateFallbackMultiFact(result) {
        return {
            suggestedEntities: result.suggestedEntities.map((entity) => ({
                ...entity,
                metadata: buildAlgorithmReviewMetadata({
                    reviewBackendMode: 'phase1_rule',
                    reviewVersion: PHASE1_RULE_REVIEW_VERSION,
                    reviewKind: `${entity.metadata?.reviewKind || entity.metadata?.algorithm_review_kind || 'explicit_entity_wording_repair'}`,
                    reviewFallbackFrom: 'model_backed_phase2',
                    provenance: `${entity.metadata?.provenance || 'algorithm_review_phase1'}`,
                    metadata: entity.metadata
                })
            })),
            suggestedFacts: result.suggestedFacts.map((fact) => ({
                ...fact,
                metadata: buildAlgorithmReviewMetadata({
                    reviewBackendMode: 'phase1_rule',
                    reviewVersion: PHASE1_RULE_REVIEW_VERSION,
                    reviewKind: `${fact.metadata?.reviewKind || fact.metadata?.algorithm_review_kind || 'multi_fact_repair'}`,
                    reviewFallbackFrom: 'model_backed_phase2',
                    provenance: `${fact.metadata?.provenance || 'algorithm_review_phase1'}`,
                    metadata: fact.metadata
                })
            }))
        };
    }
    mergeAdjudications(baseline, reviewed) {
        const merged = new Map(baseline.map((item) => [item.factId, item]));
        for (const item of reviewed) {
            if (!item.factId || !item.action || !item.reason)
                continue;
            merged.set(item.factId, {
                factId: item.factId,
                action: item.action,
                reason: item.reason,
                confidence: item.confidence,
                supersededByFactId: item.supersededByFactId,
                metadata: buildAlgorithmReviewMetadata({
                    reviewBackendMode: 'model_backed_phase2',
                    reviewVersion: MODEL_BACKED_PHASE2_REVIEW_VERSION,
                    reviewKind: `${item.metadata?.reviewKind || item.metadata?.algorithm_review_kind || 'model_backed_provisional_fact_adjudication'}`,
                    provenance: 'algorithm_review_phase2',
                    metadata: item.metadata
                })
            });
        }
        return [...merged.values()];
    }
    mergeAliasSuggestions(baseline, reviewed) {
        const merged = new Map();
        for (const item of baseline) {
            merged.set(`${item.primaryEntityId}|${item.duplicateEntityId}`, item);
        }
        for (const item of reviewed) {
            if (!item.primaryEntityId || !item.duplicateEntityId || !item.reason)
                continue;
            merged.set(`${item.primaryEntityId}|${item.duplicateEntityId}`, item);
        }
        return [...merged.values()];
    }
    mergeSuggestedEntities(baseline, reviewed) {
        const merged = new Map();
        for (const entity of baseline) {
            merged.set(`${entity.type}|${normalizeLexiconText(entity.canonicalName).toLowerCase()}`, entity);
        }
        for (const entity of reviewed) {
            if (!entity.canonicalName || !entity.type)
                continue;
            const key = `${entity.type}|${normalizeLexiconText(entity.canonicalName).toLowerCase()}`;
            merged.set(key, {
                canonicalName: entity.canonicalName,
                type: entity.type,
                aliases: entity.aliases,
                instanceMode: entity.instanceMode,
                metadata: buildAlgorithmReviewMetadata({
                    reviewBackendMode: 'model_backed_phase2',
                    reviewVersion: MODEL_BACKED_PHASE2_REVIEW_VERSION,
                    reviewKind: `${entity.metadata?.reviewKind || entity.metadata?.algorithm_review_kind || 'model_backed_entity_wording_repair'}`,
                    provenance: 'algorithm_review_phase2',
                    metadata: entity.metadata
                })
            });
        }
        return [...merged.values()];
    }
    mergeSuggestedFacts(baseline, reviewed, options) {
        const merged = new Map();
        for (const fact of baseline) {
            merged.set(this.factKey(fact), fact);
        }
        for (const fact of reviewed) {
            if (!fact.neuronId || !fact.subject || !fact.predicateFamily || !fact.validFrom || !fact.sourceText)
                continue;
            const record = {
                neuronId: fact.neuronId,
                subject: fact.subject,
                predicateFamily: fact.predicateFamily,
                predicateValue: fact.predicateValue,
                object: fact.object,
                entityId: fact.entityId,
                validFrom: fact.validFrom,
                certaintyLevel: fact.certaintyLevel || 'probable',
                confidence: fact.confidence || 0.82,
                status: fact.status || 'provisional_enriched',
                sourceText: fact.sourceText,
                metadata: buildAlgorithmReviewMetadata({
                    reviewBackendMode: 'model_backed_phase2',
                    reviewVersion: MODEL_BACKED_PHASE2_REVIEW_VERSION,
                    reviewKind: `${fact.metadata?.reviewKind || fact.metadata?.algorithm_review_kind || options.defaultKind}`,
                    provenance: 'algorithm_review_phase2',
                    metadata: fact.metadata
                })
            };
            merged.set(this.factKey(record), record);
        }
        return [...merged.values()];
    }
    factKey(fact) {
        return [
            fact.neuronId,
            fact.predicateFamily,
            normalizeLexiconText(fact.predicateValue || '').toLowerCase(),
            normalizeLexiconText(fact.object || '').toLowerCase(),
            fact.entityId || ''
        ].join('|');
    }
}
class GemmaPhase2LocalReviewRuntime {
    modelPath;
    pipelinePromise;
    constructor(modelPath) {
        this.modelPath = modelPath;
    }
    async reviewProvisionalFactCandidates(input) {
        const prompt = [
            'Return JSON only.',
            'Task: adjudicate provisional facts for offline consolidation.',
            'Schema: {"adjudications":[{"factId":"...","action":"verify|archive|reject|supersede|keep_provisional","reason":"...","confidence":0.0,"supersededByFactId":"...","metadata":{"algorithm_review_kind":"..."}}],"aliasMergeSuggestions":[]}',
            JSON.stringify({
                rawEpisodes: input.rawEpisodes.map((episode) => ({ id: episode.id, content: episode.content })),
                facts: input.facts.map((fact) => ({
                    factId: fact.factId,
                    predicateFamily: fact.predicateFamily,
                    predicateValue: fact.predicateValue,
                    object: fact.object,
                    confidence: fact.confidence,
                    status: fact.status,
                    metadata: fact.metadata
                })),
                entities: input.entities.map((entity) => ({
                    entityId: entity.entityId,
                    canonicalName: entity.canonicalName,
                    type: entity.type,
                    aliases: entity.aliases
                }))
            })
        ].join('\n');
        const parsed = await this.generateStructuredReply(prompt);
        return {
            adjudications: parsed.adjudications || [],
            aliasMergeSuggestions: []
        };
    }
    async reviewSelfCorrectionCandidates(input) {
        const prompt = [
            'Return JSON only.',
            'Task: propose corrected derived facts for self-correction utterances.',
            'Schema: {"suggestedFacts":[{"neuronId":"...","subject":"device|user|person|project","predicateFamily":"...","predicateValue":"...","object":"...","entityId":"...","validFrom":0,"certaintyLevel":"possible|probable|high","confidence":0.0,"status":"provisional_enriched","sourceText":"...","metadata":{"algorithm_review_kind":"model_backed_self_correction_repair"}}]}',
            JSON.stringify({
                rawEpisodes: input.rawEpisodes.map((episode) => ({ id: episode.id, content: episode.content, createdAt: episode.metadata.createdAt })),
                facts: input.facts.map((fact) => ({
                    factId: fact.factId,
                    neuronId: fact.neuronId,
                    predicateFamily: fact.predicateFamily,
                    predicateValue: fact.predicateValue,
                    object: fact.object,
                    entityId: fact.entityId,
                    validFrom: fact.validFrom,
                    sourceText: fact.sourceText,
                    metadata: fact.metadata
                }))
            })
        ].join('\n');
        const parsed = await this.generateStructuredReply(prompt);
        return {
            suggestedFacts: parsed.suggestedFacts || []
        };
    }
    async reviewMultiFactExtractionCandidates(input) {
        const prompt = [
            'Return JSON only.',
            'Task: propose missing derived facts and entities for multi-fact extraction repair.',
            'Schema: {"suggestedEntities":[{"canonicalName":"...","type":"device|project|person|brand|issue","aliases":["..."],"instanceMode":"auto|canonical|new_instance","metadata":{"algorithm_review_kind":"model_backed_entity_wording_repair"}}],"suggestedFacts":[{"neuronId":"...","subject":"device|user|person|project","predicateFamily":"...","predicateValue":"...","object":"...","entityId":"...","validFrom":0,"certaintyLevel":"possible|probable|high","confidence":0.0,"status":"provisional_enriched","sourceText":"...","metadata":{"algorithm_review_kind":"model_backed_multi_fact_repair"}}]}',
            JSON.stringify({
                mode: input.mode,
                rawEpisodes: input.rawEpisodes.map((episode) => ({ id: episode.id, content: episode.content, createdAt: episode.metadata.createdAt })),
                facts: input.facts.map((fact) => ({
                    factId: fact.factId,
                    neuronId: fact.neuronId,
                    predicateFamily: fact.predicateFamily,
                    predicateValue: fact.predicateValue,
                    object: fact.object,
                    entityId: fact.entityId
                })),
                entities: input.entities.map((entity) => ({
                    entityId: entity.entityId,
                    canonicalName: entity.canonicalName,
                    type: entity.type
                }))
            })
        ].join('\n');
        const parsed = await this.generateStructuredReply(prompt);
        return {
            suggestedEntities: parsed.suggestedEntities || [],
            suggestedFacts: parsed.suggestedFacts || []
        };
    }
    async generateStructuredReply(prompt) {
        const pipeline = await this.getPipeline();
        const response = await pipeline(prompt, {
            max_new_tokens: 512,
            temperature: 0.1,
            do_sample: false,
            return_full_text: false
        });
        const raw = response[0]?.generated_text || '';
        return parseStructuredReply(raw);
    }
    async getPipeline() {
        if (!this.pipelinePromise) {
            this.pipelinePromise = (async () => {
                const transformers = await import('@xenova/transformers');
                return await transformers.pipeline('text-generation', this.modelPath);
            })();
        }
        return this.pipelinePromise;
    }
}
function parseStructuredReply(raw) {
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start)
        return {};
    try {
        return JSON.parse(raw.slice(start, end + 1));
    }
    catch {
        return {};
    }
}
