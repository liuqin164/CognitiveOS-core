import type { MemoryGraph } from '../core/MemoryGraph.js';
import type { BrainRecallResult } from '../types/BrainRecallResult.js';
import type { IterativeLLMClarifier } from '../routing/IterativeLLMClarifier.js';
import type { Neuron } from '../types/index.js';
import {
  confidenceFromEvidenceCount,
  type UserInsight,
  type UserInsightCategory
} from './UserInsight.js';
import { UserModelStore } from './UserModelStore.js';

export interface UserInsightExtractorOptions {
  maxNeuronsPerRun?: number;
  triggerThreshold?: number;
}

interface ParsedInsight {
  category: UserInsightCategory;
  content: string;
  evidenceNeuronIds?: string[];
  expiresAt?: number;
}

export class UserInsightExtractor {
  private readonly maxNeuronsPerRun: number;
  private readonly triggerThreshold: number;

  constructor(
    private readonly memoryGraph: MemoryGraph,
    private readonly userModelStore: UserModelStore,
    private readonly clarifier: IterativeLLMClarifier,
    options: UserInsightExtractorOptions = {}
  ) {
    this.maxNeuronsPerRun = options.maxNeuronsPerRun ?? 50;
    this.triggerThreshold = options.triggerThreshold ?? 10;
  }

  async extract(projectId: string, windowMs = 24 * 60 * 60 * 1000): Promise<UserInsight[]> {
    const end = Date.now();
    const neurons = this.memoryGraph
      .listNeuronsByTimeRange(end - windowMs, end + 1, projectId)
      .filter((neuron) => neuron.metadata.type === 'chat' || neuron.metadata.type === 'agent_finding')
      .slice(-this.maxNeuronsPerRun);
    if (neurons.length < this.triggerThreshold) return [];

    const prompt = this.buildPrompt(projectId, neurons);
    const result = await this.clarifier.clarify(prompt, emptyRecallResult(prompt));
    const parsed = parseInsights(result.finalAnswer);
    const now = Date.now();
    const created: UserInsight[] = [];
    for (const item of parsed) {
      const evidenceNeuronIds = Array.from(new Set((item.evidenceNeuronIds?.length ? item.evidenceNeuronIds : neurons.map((n) => n.id))
        .filter((id) => neurons.some((neuron) => neuron.id === id))));
      if (!item.content.trim() || evidenceNeuronIds.length === 0) continue;
      const insight: UserInsight = {
        id: `user-insight-${projectId}-${now}-${Math.random().toString(36).slice(2)}`,
        projectId,
        category: item.category,
        content: item.content.trim(),
        confidence: confidenceFromEvidenceCount(evidenceNeuronIds.length),
        evidenceNeuronIds,
        createdAt: now,
        lastConfirmedAt: now,
        expiresAt: item.expiresAt
      };
      this.userModelStore.upsert(insight);
      created.push(insight);
    }
    return created;
  }

  private buildPrompt(projectId: string, neurons: Neuron[]): string {
    return [
      'Extract durable user insights from these agent-brain memories.',
      'Return JSON array only. Each item: {category, content, evidenceNeuronIds, expiresAt?}.',
      'Allowed categories: preference, habit, domain_knowledge, communication_style, goal.',
      'Do not include confidence; CPU will calculate it.',
      `Project: ${projectId}`,
      JSON.stringify(neurons.map((neuron) => ({
        id: neuron.id,
        type: neuron.metadata.type,
        tags: neuron.metadata.tags || [],
        content: neuron.content.slice(0, 500)
      })))
    ].join('\n');
  }
}

function parseInsights(raw: string): ParsedInsight[] {
  try {
    const parsed = JSON.parse(raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '')) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isParsedInsight);
  } catch {
    return [];
  }
}

function isParsedInsight(value: unknown): value is ParsedInsight {
  const item = value as ParsedInsight;
  return Boolean(item)
    && isCategory(item.category)
    && typeof item.content === 'string';
}

function isCategory(value: unknown): value is UserInsightCategory {
  return value === 'preference'
    || value === 'habit'
    || value === 'domain_knowledge'
    || value === 'communication_style'
    || value === 'goal';
}

function emptyRecallResult(query: string): BrainRecallResult {
  return {
    query,
    strategy: { primaryLevel: 'compiled_memory', fallbackUsed: false },
    compiledMemory: { beliefs: [], facts: [], events: [], entityTimeline: [] },
    rawEvidence: [],
    fallbackSnippets: [],
    profileSignals: [],
    profileSurface: { userProfile: [], agentPersona: [] }
  };
}
