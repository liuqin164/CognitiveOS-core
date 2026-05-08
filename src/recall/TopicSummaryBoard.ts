import { NeuronFactory } from '../core/Neuron.js';
import type { MemoryGraph } from '../core/MemoryGraph.js';
import type { SummaryStore } from '../store/SummaryStore.js';
import type { Neuron } from '../types/index.js';
import { normalizeTopicPath } from './HierarchicalRecallRouter.js';

export interface TopicSummaryEntry {
  topicPath: string;
  projectId: string;
  summaryNeuronId: string;
  lastUpdatedAt: number;
  coveredNeuronCount: number;
}

export interface TopicSummaryRefreshOptions {
  forceRebuild?: boolean;
}

const SUMMARY_TAG = 'topic_summary';
const SUMMARY_SOURCE_TAG = 'topic_summary:auto';
const SUMMARY_RUN_ID = 'topic_summary_board';

export class TopicSummaryBoard {
  constructor(
    private readonly memoryGraph: MemoryGraph,
    private readonly summaryStore: SummaryStore
  ) {}

  refresh(topicPath: string, projectId: string, options: TopicSummaryRefreshOptions = {}): string | null {
    const normalized = normalizeTopicPath(topicPath);
    if (!normalized || !projectId) return null;

    const sourceNeurons = this.getSourceNeurons(normalized, projectId);
    if (sourceNeurons.length === 0) return this.getSummaryNeuron(normalized, projectId)?.id ?? null;

    const existing = this.getSummaryNeuron(normalized, projectId);
    const latestSourceAt = Math.max(...sourceNeurons.map((neuron) => neuron.metadata.updatedAt || neuron.metadata.createdAt));
    if (existing && !options.forceRebuild && (existing.metadata.updatedAt || existing.metadata.createdAt) >= latestSourceAt) {
      return existing.id;
    }

    const now = Date.now();
    const summaryText = this.buildSummaryText(normalized, sourceNeurons);
    const tags = [SUMMARY_TAG, SUMMARY_SOURCE_TAG, `topic:${normalized}`];
    const sourceIds = sourceNeurons.map((neuron) => neuron.id);

    this.summaryStore.insertSummary({
      projectId,
      scope: 'project',
      text: summaryText,
      confidence: 0.86,
      status: 'verified',
      sourceNeuronIds: sourceIds,
      deepWriteRunId: SUMMARY_RUN_ID,
      deepWriteCandidateId: normalized,
      createdAt: now,
      updatedAt: now
    });

    if (existing) {
      this.memoryGraph.updateNeuronContent(existing.id, summaryText);
      this.memoryGraph.updateNeuronMetadata(existing.id, {
        tags,
        updatedAt: now,
        confidence: 0.86,
        importanceLevel: 'normal',
        isPinned: false,
        status: 'active'
      });
      return existing.id;
    }

    const summaryNeuron = NeuronFactory.create(
      summaryText,
      this.memoryGraph.getLatestNeuronSelfHash(projectId) || 'genesis',
      { T: now, S: [0, 0, 0], V: [] },
      {
        projectId,
        topicPath: normalized,
        type: 'doc',
        createdAt: now,
        updatedAt: now,
        tags,
        status: 'active',
        confidence: 0.86,
        importanceLevel: 'normal',
        isPinned: false,
        sourceType: 'llm_inference'
      }
    );
    this.memoryGraph.addNeuron(summaryNeuron);
    return summaryNeuron.id;
  }

  listEntries(projectId?: string): TopicSummaryEntry[] {
    return this.memoryGraph.getTopicPaths(projectId)
      .map((path) => normalizeTopicPath(path))
      .filter((path): path is string => Boolean(path))
      .map((topicPath) => {
        const summary = this.getSummaryNeuron(topicPath, projectId);
        if (!summary) return null;
        return {
          topicPath,
          projectId: summary.metadata.projectId || '',
          summaryNeuronId: summary.id,
          lastUpdatedAt: summary.metadata.updatedAt || summary.metadata.createdAt,
          coveredNeuronCount: this.getSourceNeurons(topicPath, summary.metadata.projectId).length
        };
      })
      .filter((entry): entry is TopicSummaryEntry => Boolean(entry))
      .sort((a, b) => a.topicPath.localeCompare(b.topicPath));
  }

  getSummaryNeuron(topicPath: string, projectId?: string): Neuron | null {
    const normalized = normalizeTopicPath(topicPath);
    if (!normalized) return null;
    const candidates = this.memoryGraph.getNeuronIdsByTopicPrefix(normalized, projectId)
      .map((id) => this.memoryGraph.getNeuron(id))
      .filter((neuron): neuron is Neuron => Boolean(neuron))
      .filter((neuron) =>
        neuron.metadata.topicPath === normalized
        && neuron.metadata.type === 'doc'
        && this.isSummaryNeuron(neuron)
      );
    candidates.sort((a, b) => (b.metadata.updatedAt || b.metadata.createdAt) - (a.metadata.updatedAt || a.metadata.createdAt));
    return candidates[0] || null;
  }

  private getSourceNeurons(topicPath: string, projectId?: string): Neuron[] {
    return this.memoryGraph.getNeuronIdsByTopicPrefix(topicPath, projectId)
      .map((id) => this.memoryGraph.getNeuron(id))
      .filter((neuron): neuron is Neuron => Boolean(neuron))
      .filter((neuron) => !this.isSummaryNeuron(neuron))
      .sort((a, b) => (b.metadata.updatedAt || b.metadata.createdAt) - (a.metadata.updatedAt || a.metadata.createdAt));
  }

  private isSummaryNeuron(neuron: Neuron): boolean {
    return neuron.metadata.tags?.includes(SUMMARY_TAG) === true;
  }

  private buildSummaryText(topicPath: string, sourceNeurons: Neuron[]): string {
    const samples = sourceNeurons
      .slice(0, 5)
      .map((neuron) => this.compact(neuron.content))
      .filter(Boolean);
    return [
      `Topic summary for ${topicPath}.`,
      `Covers ${sourceNeurons.length} memories.`,
      ...samples.map((sample) => `- ${sample}`)
    ].join('\n');
  }

  private compact(content: string): string {
    return content.replace(/\s+/g, ' ').trim().slice(0, 180);
  }
}
