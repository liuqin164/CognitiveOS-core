import type { MemoryGraph } from '../core/MemoryGraph.js';
import { lexicalSimilarity } from '../utils/text.js';

export interface TopicRouteResult {
  matchedTopicPath: string | null;
  confidence: number;
  candidateNeuronIds: string[];
  fallbackToGlobal: boolean;
}

export interface HierarchicalRecallRouterOptions {
  minConfidence?: number;
  maxCandidates?: number;
}

export class HierarchicalRecallRouter {
  constructor(
    private readonly memoryGraph: MemoryGraph,
    private readonly options: HierarchicalRecallRouterOptions = {}
  ) {}

  route(query: string, projectId?: string, hintTopicPath?: string): TopicRouteResult {
    const maxCandidates = this.options.maxCandidates ?? 500;
    const normalizedHint = normalizeTopicPath(hintTopicPath);
    if (normalizedHint) {
      const ids = this.memoryGraph.getNeuronIdsByTopicPrefix(normalizedHint, projectId).slice(0, maxCandidates);
      return ids.length > 0
        ? { matchedTopicPath: normalizedHint, confidence: 1, candidateNeuronIds: ids, fallbackToGlobal: false }
        : { matchedTopicPath: null, confidence: 0, candidateNeuronIds: [], fallbackToGlobal: true };
    }

    if (!query.trim()) {
      return { matchedTopicPath: null, confidence: 0, candidateNeuronIds: [], fallbackToGlobal: true };
    }

    const scored = this.scoreTopics(query, this.memoryGraph.getTopicPaths(projectId));
    const best = scored[0];
    const minConfidence = this.options.minConfidence ?? 0.15;
    if (!best || best.score < minConfidence) {
      return { matchedTopicPath: null, confidence: best?.score ?? 0, candidateNeuronIds: [], fallbackToGlobal: true };
    }

    return {
      matchedTopicPath: best.path,
      confidence: best.score,
      candidateNeuronIds: this.memoryGraph.getNeuronIdsByTopicPrefix(best.path, projectId).slice(0, maxCandidates),
      fallbackToGlobal: false
    };
  }

  scoreTopics(query: string, topics: string[]): Array<{ path: string; score: number }> {
    return topics
      .map((path) => ({ path, score: this.topicScore(query, path) }))
      .sort((a, b) => b.score - a.score || a.path.localeCompare(b.path));
  }

  topicScore(query: string, topicPath: string): number {
    const normalizedQuery = query.toLowerCase();
    const segments = topicPath.split('/').map((segment) => segment.trim()).filter(Boolean);
    const segmentHits = segments.filter((segment) => normalizedQuery.includes(segment.toLowerCase())).length;
    const lexical = lexicalSimilarity(query, topicPath);
    return Math.min(1, lexical * 0.7 + Math.min(segmentHits * 0.2, 0.3));
  }
}

export function normalizeTopicPath(topicPath?: string): string | undefined {
  if (!topicPath) return undefined;
  const normalized = topicPath
    .trim()
    .replace(/\\/g, '/')
    .replace(/\/+/g, '/')
    .replace(/^\/+|\/+$/g, '')
    .split('/')
    .map((segment) => segment.trim())
    .filter(Boolean)
    .slice(0, 5)
    .map((segment) => segment.replace(/[A-Za-z]+/g, (match) => match.toLowerCase()))
    .join('/');
  return normalized || undefined;
}
