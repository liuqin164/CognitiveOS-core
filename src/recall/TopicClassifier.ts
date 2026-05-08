import type { MemoryGraph } from '../core/MemoryGraph.js';
import type { Embedder } from '../store/Embedder.js';
import type { Neuron } from '../types/index.js';
import { HierarchicalRecallRouter, normalizeTopicPath } from './HierarchicalRecallRouter.js';
import type { TopicRegistry } from './TopicRegistry.js';
import { ZH_TOPIC_LEXICON } from '../lexicon/zh/index.js';

export interface TopicClassifierOptions {
  confidenceThreshold?: number;
  embeddingThreshold?: number;
  enableEmbedding?: boolean;
  maxTopicsToScore?: number;
}

export interface TopicClassificationResult {
  topicPath?: string;
  confidence: number;
  strategy: 'lexical' | 'embedding' | 'fallback';
}

export class TopicClassifier {
  private readonly router: HierarchicalRecallRouter;

  constructor(
    private readonly memoryGraph: MemoryGraph,
    private readonly options: TopicClassifierOptions = {},
    private readonly topicRegistry?: TopicRegistry,
    private readonly embedder?: Embedder
  ) {
    this.router = new HierarchicalRecallRouter(memoryGraph);
  }

  classify(content: string, projectId?: string): TopicClassificationResult {
    return this.classifyLexical(content, projectId);
  }

  async classifyAsync(content: string, projectId?: string): Promise<TopicClassificationResult> {
    const lexical = this.classifyLexical(content, projectId);
    if (lexical.strategy === 'lexical') return lexical;
    if (this.options.enableEmbedding !== true || !this.embedder || !content.trim()) return lexical;
    const embedding = await this.classifyByEmbedding(content, projectId);
    return embedding ?? lexical;
  }

  private classifyLexical(content: string, projectId?: string): TopicClassificationResult {
    if (!content.trim()) {
      return this.fallback();
    }

    const zhTopic = this.matchChineseTopic(content);
    if (zhTopic) return zhTopic;

    const topics = this.getTopicPaths(projectId)
      .map((path) => normalizeTopicPath(path))
      .filter((path): path is string => Boolean(path));
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

  private async classifyByEmbedding(content: string, projectId?: string): Promise<TopicClassificationResult | null> {
    const queryVector = await this.embedder!.embed(content);
    if (queryVector.length === 0) return null;
    const threshold = this.options.embeddingThreshold ?? 0.75;
    const topics = this.getTopicPaths(projectId)
      .map((path) => normalizeTopicPath(path))
      .filter((path): path is string => Boolean(path))
      .slice(0, Math.max(1, this.options.maxTopicsToScore ?? 50));
    let best: TopicClassificationResult | null = null;
    for (const topicPath of topics) {
      const score = this.scoreTopicVector(queryVector, topicPath, projectId);
      if (!best || score > best.confidence) {
        best = { topicPath, confidence: score, strategy: 'embedding' };
      }
    }
    return best && best.confidence >= threshold ? best : null;
  }

  private scoreTopicVector(queryVector: number[], topicPath: string, projectId?: string): number {
    const representatives = this.getRepresentativeNeurons(topicPath, projectId);
    if (representatives.length === 0) return 0;
    return Math.max(...representatives.map((neuron) => this.cosineSimilarity(queryVector, neuron.coordinates.V)));
  }

  private getRepresentativeNeurons(topicPath: string, projectId?: string): Neuron[] {
    const neurons = this.memoryGraph.getNeuronIdsByTopicPrefix(topicPath, projectId)
      .map((id) => this.memoryGraph.getNeuron(id))
      .filter((neuron): neuron is Neuron => Boolean(neuron))
      .filter((neuron) => neuron.coordinates.V.length > 0);
    const summary = neurons.find((neuron) => neuron.metadata.tags?.includes('topic_summary') === true);
    const recent = neurons
      .filter((neuron) => neuron.id !== summary?.id)
      .sort((a, b) => (b.metadata.createdAt - a.metadata.createdAt) || a.id.localeCompare(b.id))
      .slice(0, 3);
    return summary ? [summary, ...recent] : recent;
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length === 0 || b.length === 0) return 0;
    const length = Math.min(a.length, b.length);
    let dot = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;
    for (let index = 0; index < length; index++) {
      dot += a[index] * b[index];
      magnitudeA += a[index] * a[index];
      magnitudeB += b[index] * b[index];
    }
    if (magnitudeA === 0 || magnitudeB === 0) return 0;
    return dot / (Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB));
  }

  private getTopicPaths(projectId?: string): string[] {
    return this.topicRegistry?.getTopicPaths(projectId) ?? this.memoryGraph.getTopicPaths(projectId);
  }

  private matchChineseTopic(content: string): TopicClassificationResult | null {
    if (!/[\u3400-\u9fff]/.test(content)) return null;
    let best: { topicPath: string; matched: number; total: number } | null = null;
    for (const entry of ZH_TOPIC_LEXICON) {
      const matched = entry.keywords.filter((keyword) => content.includes(keyword)).length;
      if (matched === 0) continue;
      if (
        !best
        || matched > best.matched
        || (matched === best.matched && entry.keywords.length < best.total)
      ) {
        best = { topicPath: entry.topicPath, matched, total: entry.keywords.length };
      }
    }
    if (!best) return null;
    return {
      topicPath: best.topicPath,
      confidence: Math.min(1, Math.max(0.5, best.matched / Math.min(5, best.total))),
      strategy: 'lexical',
    };
  }

  private fallback(confidence = 0): TopicClassificationResult {
    return {
      topicPath: undefined,
      confidence,
      strategy: 'fallback'
    };
  }
}
