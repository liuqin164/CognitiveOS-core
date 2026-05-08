import { ToolEvidenceNormalizer } from './ToolEvidenceNormalizer.js';
import { ToolEvidencePack } from './ToolEvidencePack.js';
const DEFAULT_CONFIG = {
    maxTotalTokens: 1200,
    maxFactsPerPack: 40,
    maxNeuronSummaries: 10,
    compressionStrategy: 'salience_sort',
};
export class EvidenceBudgetManager {
    config;
    evidencePack = new ToolEvidencePack();
    normalizer = new ToolEvidenceNormalizer();
    constructor(config = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
    }
    absorb(input) {
        const item = this.normalizer.normalize(input);
        item.facts = item.facts.slice(0, this.config.maxFactsPerPack);
        item.neurons = item.neurons.slice(0, this.config.maxNeuronSummaries);
        this.evidencePack.add(item);
        if (this.state().isOverBudget)
            this.compress();
        return item;
    }
    state() {
        const usedTokens = this.evidencePack.totalTokens();
        return {
            usedTokens,
            remainingTokens: Math.max(0, this.config.maxTotalTokens - usedTokens),
            isOverBudget: usedTokens > this.config.maxTotalTokens,
        };
    }
    pack() {
        return this.evidencePack;
    }
    compress() {
        if (!this.state().isOverBudget)
            return;
        this.evidencePack.items.sort((a, b) => b.relevanceScore - a.relevanceScore || a.addedAt - b.addedAt);
        while (this.state().isOverBudget && this.evidencePack.items.length > 0) {
            const last = this.evidencePack.items[this.evidencePack.items.length - 1];
            if (this.config.compressionStrategy === 'drop_tail' || last.facts.length + last.events.length + last.neurons.length <= 1) {
                this.evidencePack.items.pop();
                continue;
            }
            if (last.facts.length > 0)
                last.facts.pop();
            else if (last.events.length > 0)
                last.events.pop();
            else if (last.neurons.length > 0)
                last.neurons.pop();
            last.estimatedTokens = Math.max(20, Math.floor(last.estimatedTokens * 0.75));
        }
    }
}
