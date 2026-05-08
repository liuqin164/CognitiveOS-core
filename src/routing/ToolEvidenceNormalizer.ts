import type { BeliefRecord } from '../types/index.js';
import type { EventRecord, FactRecord } from '../store/FactStore.js';
import type { BrainToolCall, BrainToolResult } from './LLMToolSchema.js';
import { estimateTokens, type NeuronEvidenceSummary, type ToolEvidenceItem } from './ToolEvidencePack.js';

export interface ToolEvidenceNormalizeInput {
  toolResult: BrainToolResult;
  call: BrainToolCall;
  sanitizedResult: unknown;
  projectId?: string;
  injectionRiskDetected?: boolean;
}

export class ToolEvidenceNormalizer {
  normalize(input: ToolEvidenceNormalizeInput): ToolEvidenceItem {
    const payload = objectPayload(input.sanitizedResult);
    const facts = factArray(payload.facts);
    const events = eventArray(payload.events);
    const neurons = neuronSummaries(payload);
    const entityIds = entityIdsFor(input.call, payload, facts);
    const beliefs = beliefArray(payload.beliefs);
    const query = input.call.query ?? input.call.neuron_id ?? input.call.entity_name ?? '';
    const relevanceScore = computeRelevance(query, facts, events, neurons, beliefs);

    return {
      toolCallId: input.toolResult.callId,
      toolName: input.toolResult.toolName,
      query,
      facts,
      events,
      neurons,
      entityIds,
      beliefs,
      relevanceScore,
      estimatedTokens: estimateTokens(JSON.stringify({ facts, events, neurons, entityIds, beliefs })),
      addedAt: Date.now(),
      projectId: input.projectId,
      sanitized: true,
      injectionRiskDetected: input.injectionRiskDetected ?? false,
    };
  }
}

function objectPayload(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function factArray(value: unknown): FactRecord[] {
  return Array.isArray(value) ? value as FactRecord[] : [];
}

function eventArray(value: unknown): EventRecord[] {
  return Array.isArray(value) ? value as EventRecord[] : [];
}

function beliefArray(value: unknown): BeliefRecord[] {
  return Array.isArray(value) ? value as BeliefRecord[] : [];
}

function neuronSummaries(payload: Record<string, unknown>): NeuronEvidenceSummary[] {
  const summaries: NeuronEvidenceSummary[] = [];
  const neuron = objectPayload(payload.neuron);
  if (typeof neuron.neuronId === 'string') {
    summaries.push({
      neuronId: neuron.neuronId,
      contentPreview: String(neuron.content ?? '').slice(0, 500),
      tags: Array.isArray(neuron.tags) ? neuron.tags.filter((tag): tag is string => typeof tag === 'string') : [],
      type: typeof neuron.type === 'string' ? neuron.type : 'unknown',
      createdAt: typeof neuron.createdAt === 'number' ? neuron.createdAt : undefined,
      projectId: typeof neuron.projectId === 'string' ? neuron.projectId : undefined,
    });
  }

  const neighbors = Array.isArray(payload.neighbors) ? payload.neighbors : [];
  for (const raw of neighbors) {
    const n = objectPayload(raw);
    if (typeof n.neuronId !== 'string') continue;
    summaries.push({
      neuronId: n.neuronId,
      contentPreview: String(n.content ?? '').slice(0, 300),
      tags: Array.isArray(n.tags) ? n.tags.filter((tag): tag is string => typeof tag === 'string') : [],
      type: typeof n.type === 'string' ? n.type : 'unknown',
      projectId: typeof n.projectId === 'string' ? n.projectId : undefined,
    });
  }

  return summaries;
}

function entityIdsFor(call: BrainToolCall, payload: Record<string, unknown>, facts: FactRecord[]): string[] {
  const ids = new Set<string>();
  if (typeof payload.entityId === 'string') ids.add(payload.entityId);
  if (call.entity_name && typeof payload.entityId === 'string') ids.add(payload.entityId);
  for (const fact of facts) {
    if (fact.entityId) ids.add(fact.entityId);
  }
  return Array.from(ids);
}

function computeRelevance(
  query: string,
  facts: FactRecord[],
  events: EventRecord[],
  neurons: NeuronEvidenceSummary[],
  beliefs: BeliefRecord[]
): number {
  const q = query.toLowerCase();
  if (!q) return 0.5;
  const haystacks = [
    ...facts.map((f) => `${f.subject} ${f.predicateFamily} ${f.predicateValue ?? ''} ${f.object ?? ''}`),
    ...events.map((e) => `${e.eventType} ${e.actor ?? ''} ${e.target ?? ''}`),
    ...neurons.map((n) => n.contentPreview),
    ...beliefs.map((b) => `${b.subject} ${b.predicate} ${b.objectValue.raw}`),
  ];
  if (haystacks.length === 0) return 0.1;
  const hits = haystacks.filter((text) => text.toLowerCase().includes(q)).length;
  return Math.max(0.2, Math.min(1, hits / haystacks.length + 0.4));
}
