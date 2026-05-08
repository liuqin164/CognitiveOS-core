import { HierarchicalRecallRouter, normalizeTopicPath } from './HierarchicalRecallRouter.js';
import { ZH_TOPIC_LEXICON } from '../lexicon/zh/index.js';
export class TopicClassifier {
    memoryGraph;
    options;
    topicRegistry;
    embedder;
    router;
    constructor(memoryGraph, options = {}, topicRegistry, embedder) {
        this.memoryGraph = memoryGraph;
        this.options = options;
        this.topicRegistry = topicRegistry;
        this.embedder = embedder;
        this.router = new HierarchicalRecallRouter(memoryGraph);
    }
    classify(content, projectId) {
        return this.classifyLexical(content, projectId);
    }
    async classifyAsync(content, projectId) {
        const lexical = this.classifyLexical(content, projectId);
        if (lexical.strategy === 'lexical')
            return lexical;
        if (this.options.enableEmbedding !== true || !this.embedder || !content.trim())
            return lexical;
        const embedding = await this.classifyByEmbedding(content, projectId);
        return embedding ?? lexical;
    }
    classifyLexical(content, projectId) {
        if (!content.trim()) {
            return this.fallback();
        }
        const zhTopic = this.matchChineseTopic(content);
        if (zhTopic)
            return zhTopic;
        const topics = this.getTopicPaths(projectId)
            .map((path) => normalizeTopicPath(path))
            .filter((path) => Boolean(path));
        if (topics.length === 0) {
            return this.fallback();
        }
        const maxTopicsToScore = Math.max(1, this.options.maxTopicsToScore ?? 50);
        const scored = this.router.scoreTopics(content, topics.slice(0, maxTopicsToScore));
        const best = scored[0];
        const confidenceThreshold = this.options.confidenceThreshold ?? 0.25;
        if (best && best.score >= confidenceThreshold) {
            return {
                topicPath: best.path,
                confidence: best.score,
                strategy: 'lexical'
            };
        }
        return this.fallback(best?.score ?? 0);
    }
    async classifyByEmbedding(content, projectId) {
        const queryVector = await this.embedder.embed(content);
        if (queryVector.length === 0)
            return null;
        const threshold = this.options.embeddingThreshold ?? 0.75;
        const topics = this.getTopicPaths(projectId)
            .map((path) => normalizeTopicPath(path))
            .filter((path) => Boolean(path))
            .slice(0, Math.max(1, this.options.maxTopicsToScore ?? 50));
        let best = null;
        for (const topicPath of topics) {
            const score = this.scoreTopicVector(queryVector, topicPath, projectId);
            if (!best || score > best.confidence) {
                best = { topicPath, confidence: score, strategy: 'embedding' };
            }
        }
        return best && best.confidence >= threshold ? best : null;
    }
    scoreTopicVector(queryVector, topicPath, projectId) {
        const representatives = this.getRepresentativeNeurons(topicPath, projectId);
        if (representatives.length === 0)
            return 0;
        return Math.max(...representatives.map((neuron) => this.cosineSimilarity(queryVector, neuron.coordinates.V)));
    }
    getRepresentativeNeurons(topicPath, projectId) {
        const neurons = this.memoryGraph.getNeuronIdsByTopicPrefix(topicPath, projectId)
            .map((id) => this.memoryGraph.getNeuron(id))
            .filter((neuron) => Boolean(neuron))
            .filter((neuron) => neuron.coordinates.V.length > 0);
        const summary = neurons.find((neuron) => neuron.metadata.tags?.includes('topic_summary') === true);
        const recent = neurons
            .filter((neuron) => neuron.id !== summary?.id)
            .sort((a, b) => (b.metadata.createdAt - a.metadata.createdAt) || a.id.localeCompare(b.id))
            .slice(0, 3);
        return summary ? [summary, ...recent] : recent;
    }
    cosineSimilarity(a, b) {
        if (a.length === 0 || b.length === 0)
            return 0;
        const length = Math.min(a.length, b.length);
        let dot = 0;
        let magnitudeA = 0;
        let magnitudeB = 0;
        for (let index = 0; index < length; index++) {
            dot += a[index] * b[index];
            magnitudeA += a[index] * a[index];
            magnitudeB += b[index] * b[index];
        }
        if (magnitudeA === 0 || magnitudeB === 0)
            return 0;
        return dot / (Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB));
    }
    getTopicPaths(projectId) {
        return this.topicRegistry?.getTopicPaths(projectId) ?? this.memoryGraph.getTopicPaths(projectId);
    }
    matchChineseTopic(content) {
        if (!/[\u3400-\u9fff]/.test(content))
            return null;
        let best = null;
        for (const entry of ZH_TOPIC_LEXICON) {
            const matched = entry.keywords.filter((keyword) => content.includes(keyword)).length;
            if (matched === 0)
                continue;
            if (!best
                || matched > best.matched
                || (matched === best.matched && entry.keywords.length < best.total)) {
                best = { topicPath: entry.topicPath, matched, total: entry.keywords.length };
            }
        }
        if (!best)
            return null;
        return {
            topicPath: best.topicPath,
            confidence: Math.min(1, Math.max(0.5, best.matched / Math.min(5, best.total))),
            strategy: 'lexical',
        };
    }
    fallback(confidence = 0) {
        return {
            topicPath: undefined,
            confidence,
            strategy: 'fallback'
        };
    }
}
