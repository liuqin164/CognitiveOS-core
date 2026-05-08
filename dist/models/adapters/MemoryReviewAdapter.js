import { Phase1RuleAlgorithmReviewBackend } from '../../algorithm/AlgorithmReviewBackend.js';
function truncate(value, maxLength = 1500) {
    return value.length <= maxLength ? value : `${value.slice(0, maxLength)}...`;
}
function safeParse(raw) {
    if (!raw.trim())
        return {};
    try {
        return JSON.parse(raw);
    }
    catch {
        return {};
    }
}
export class MemoryReviewAdapter {
    generateFn;
    constructor(generateFn) {
        this.generateFn = generateFn;
    }
    async reviewProvisionalFactCandidates(input) {
        const system = 'Return JSON only with {"adjudications":[],"aliasMergeSuggestions":[]}.';
        const user = truncate(JSON.stringify({
            rawEpisodes: input.rawEpisodes.map((episode) => ({
                id: episode.id,
                content: episode.content,
                createdAt: episode.metadata.createdAt
            })),
            facts: input.facts,
            entities: input.entities
        }));
        const parsed = safeParse(await this.generateFn(system, user));
        return {
            adjudications: Array.isArray(parsed.adjudications) ? parsed.adjudications : [],
            aliasMergeSuggestions: Array.isArray(parsed.aliasMergeSuggestions) ? parsed.aliasMergeSuggestions : []
        };
    }
    async reviewSelfCorrectionCandidates(input) {
        const system = 'Return JSON only with {"suggestedFacts":[]}.';
        const user = truncate(JSON.stringify({
            rawEpisodes: input.rawEpisodes.map((episode) => ({
                id: episode.id,
                content: episode.content,
                createdAt: episode.metadata.createdAt
            })),
            facts: input.facts,
            entities: input.entities
        }));
        const parsed = safeParse(await this.generateFn(system, user));
        return {
            suggestedFacts: Array.isArray(parsed.suggestedFacts) ? parsed.suggestedFacts : []
        };
    }
    async reviewMultiFactExtractionCandidates(input) {
        const system = 'Return JSON only with {"suggestedEntities":[],"suggestedFacts":[]}.';
        const user = truncate(JSON.stringify({
            mode: input.mode,
            rawEpisodes: input.rawEpisodes.map((episode) => ({
                id: episode.id,
                content: episode.content,
                createdAt: episode.metadata.createdAt
            })),
            facts: input.facts,
            entities: input.entities
        }));
        const parsed = safeParse(await this.generateFn(system, user));
        return {
            suggestedEntities: Array.isArray(parsed.suggestedEntities) ? parsed.suggestedEntities : [],
            suggestedFacts: Array.isArray(parsed.suggestedFacts) ? parsed.suggestedFacts : []
        };
    }
}
export function createMemoryReviewAdapter(registry) {
    if (registry.isRuleOnly('memory')) {
        return new Phase1RuleAlgorithmReviewBackend();
    }
    return new MemoryReviewAdapter(registry.getTextGenerator('memory'));
}
