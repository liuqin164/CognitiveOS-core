import type { BeliefRecord } from '../types/index.js';
import type { EventRecord, FactRecord } from '../store/FactStore.js';
import type { BrainToolName } from './LLMToolSchema.js';
import { ToolResultSanitizer } from './ToolResultSanitizer.js';

export interface NeuronEvidenceSummary {
  neuronId: string;
  contentPreview: string;
  tags: string[];
  type: string;
  createdAt?: number;
  projectId?: string;
}

export interface ToolEvidenceItem {
  toolCallId: string;
  toolName: BrainToolName;
  query: string;
  facts: FactRecord[];
  events: EventRecord[];
  neurons: NeuronEvidenceSummary[];
  entityIds: string[];
  beliefs: BeliefRecord[];
  relevanceScore: number;
  estimatedTokens: number;
  addedAt: number;
  projectId?: string;
  sanitized: boolean;
  injectionRiskDetected: boolean;
}

export class ToolEvidencePack {
  readonly items: ToolEvidenceItem[] = [];

  add(item: ToolEvidenceItem): void {
    this.items.push(item);
    this.deduplicate();
  }

  deduplicate(): void {
    const seenFacts = new Set<string>();
    const seenEvents = new Set<string>();
    const seenNeurons = new Set<string>();

    for (const item of this.items) {
      item.facts = item.facts.filter((fact) => unique(seenFacts, fact.factId));
      item.events = item.events.filter((event) => unique(seenEvents, event.eventId));
      item.neurons = item.neurons.filter((neuron) => unique(seenNeurons, neuron.neuronId));
    }
  }

  totalTokens(): number {
    return this.items.reduce((sum, item) => sum + item.estimatedTokens, 0);
  }

  toPromptSummary(limit: number): string {
    const sanitizer = new ToolResultSanitizer();
    const selected = this.items
      .slice()
      .sort((a, b) => b.relevanceScore - a.relevanceScore || a.addedAt - b.addedAt);

    const lines: string[] = [];
    let used = 0;
    for (const item of selected) {
      if (used >= limit) break;
      const remaining = limit - used;
      const summary = summarizeItem(item, remaining);
      used += estimateTokens(summary);
      lines.push(summary);
    }

    return sanitizer.wrapForPrompt(lines.join('\n\n') || '（无工具追加证据）');
  }
}

function unique(seen: Set<string>, key: string): boolean {
  if (!key) return true;
  if (seen.has(key)) return false;
  seen.add(key);
  return true;
}

function summarizeItem(item: ToolEvidenceItem, tokenLimit: number): string {
  const facts = item.facts.slice(0, 12).map((fact) => ({
    factId: fact.factId,
    subject: fact.subject,
    predicateFamily: fact.predicateFamily,
    predicateValue: fact.predicateValue,
    object: fact.object,
    confidence: fact.confidence,
  }));
  const events = item.events.slice(0, 8).map((event) => ({
    eventId: event.eventId,
    eventType: event.eventType,
    actor: event.actor,
    target: event.target,
    confidence: event.confidence,
  }));
  const neurons = item.neurons.slice(0, 6).map((neuron) => ({
    neuronId: neuron.neuronId,
    contentPreview: neuron.contentPreview,
    type: neuron.type,
    tags: neuron.tags,
  }));

  const text = JSON.stringify({
    toolCallId: item.toolCallId,
    toolName: item.toolName,
    query: item.query,
    facts,
    events,
    neurons,
    entityIds: item.entityIds,
    sanitized: item.sanitized,
    injectionRiskDetected: item.injectionRiskDetected,
  });

  return text.slice(0, Math.max(80, tokenLimit * 4));
}

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}
