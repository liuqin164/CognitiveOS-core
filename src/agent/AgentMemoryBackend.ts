import type { MemoryKernel, MemoryKernelNavigationResult } from '../factory.js';
import { isOperationalNoiseText, isRecallableMemoryEvidence } from '../recall/RecallGovernance.js';
import type { MemoryEvent, MemorySourceRef } from '../types/index.js';

export type AgentTurnIngestMode =
  | 'immediate_compile'
  | 'selective_compile'
  | 'raw_archive_only'
  | 'raw_then_dream';

export type AgentTurnCompileReason =
  | 'immediate_compile'
  | 'durable_signal_detected'
  | 'low_signal_turn'
  | 'raw_archive_only'
  | 'raw_then_dream';

export interface AgentTurnMemory {
  agentId: string;
  projectId: string;
  workspaceId?: string;
  sessionId: string;
  threadId?: string;
  turnId?: string;
  turnSeq?: number;
  userText: string;
  assistantText?: string;
  timestamp?: number;
  ingestMode?: AgentTurnIngestMode;
  metadata?: Record<string, unknown>;
}

export interface AgentTurnMemoryResult {
  mode: AgentTurnIngestMode;
  reason: AgentTurnCompileReason;
  compiled: boolean;
  rawEventIds: string[];
  compiledNeuronId?: string;
}

export interface AgentRecallQuery {
  agentId: string;
  projectId: string;
  query: string;
  limit?: number;
  startTime?: number;
  endTime?: number;
}

export interface AgentToolCallMemory {
  agentId: string;
  projectId: string;
  workspaceId?: string;
  sessionId: string;
  threadId?: string;
  turnId?: string;
  turnSeq?: number;
  assistantEventId?: string;
  toolCallId?: string;
  toolName: string;
  input?: unknown;
  eventOrdinal?: number;
  timestamp?: number;
  metadata?: Record<string, unknown>;
}

export interface AgentToolObservationMemory {
  agentId: string;
  projectId: string;
  workspaceId?: string;
  sessionId: string;
  threadId?: string;
  turnId?: string;
  turnSeq?: number;
  toolCallEventId: string;
  toolCallId?: string;
  toolName: string;
  output: string;
  eventOrdinal?: number;
  timestamp?: number;
  metadata?: Record<string, unknown>;
}

export interface AgentTaskEventMemory {
  agentId: string;
  projectId: string;
  workspaceId?: string;
  sessionId: string;
  threadId?: string;
  turnId?: string;
  turnSeq?: number;
  parentEventId?: string;
  taskId?: string;
  title?: string;
  content: string;
  eventOrdinal?: number;
  timestamp?: number;
  metadata?: Record<string, unknown>;
}

export interface AgentRecallItem {
  id: string;
  text: string;
  projectId?: string;
  topicPath?: string;
  tags: string[];
  source?: string;
}

export interface AgentRecallResult {
  recallMode: MemoryKernelNavigationResult['recallMode'] | 'raw_ledger_fallback';
  items: AgentRecallItem[];
  narrative?: NonNullable<MemoryKernelNavigationResult['navigation']>['narrative'];
  pulseTrace?: NonNullable<MemoryKernelNavigationResult['navigation']>['pulse']['trace'];
  temporalTraversal?: NonNullable<MemoryKernelNavigationResult['navigation']>['branchSearch']['temporalTraversal'];
  runtime?: NonNullable<MemoryKernelNavigationResult['navigation']>['runtime'];
  fallbackUsed: boolean;
}

export class KernelAgentMemoryBackend {
  constructor(private readonly kernel: MemoryKernel) {}

  async rememberTurn(turn: AgentTurnMemory): Promise<void> {
    await this.rememberTurnWithResult(turn);
  }

  async rememberTurnWithResult(turn: AgentTurnMemory): Promise<AgentTurnMemoryResult> {
    const occurredAt = turn.timestamp ?? Date.now();
    const threadId = turn.threadId || turn.sessionId;
    const turnSeq = turn.turnSeq ?? this.kernel.eventStore.getNextTurnSeq(threadId);
    const turnId = turn.turnId || `${turn.agentId}:${turn.sessionId}:${turnSeq}:${occurredAt}`;
    const sourceId = `${turn.agentId}:${turn.sessionId}`;
    const mode = turn.ingestMode ?? 'immediate_compile';
    const userEvent = this.kernel.recordRawEvent({
      projectId: turn.projectId,
      workspaceId: turn.workspaceId,
      threadId,
      sessionId: turn.sessionId,
      turnId,
      turnSeq,
      role: 'user',
      content: turn.userText,
      eventOrdinal: 1,
      occurredAt,
      sourceId,
      metadata: turn.metadata,
    });
    const assistantEvent = turn.assistantText
      ? this.kernel.recordRawEvent({
        projectId: turn.projectId,
        workspaceId: turn.workspaceId,
        threadId,
        sessionId: turn.sessionId,
        turnId,
        turnSeq,
        role: 'assistant',
        content: turn.assistantText,
        eventOrdinal: 2,
        occurredAt,
        parentEventId: userEvent.eventId,
        prevEventId: userEvent.eventId,
        causalityType: 'replies_to',
        sourceId,
        metadata: turn.metadata,
      })
      : undefined;
    if (assistantEvent) {
      this.kernel.eventStore.updateNextEventId(userEvent.eventId, assistantEvent.eventId);
    }

    const sourceRefs = [userEvent, assistantEvent].filter(Boolean).map((event) => ({
      eventId: event!.eventId,
      eventType: 'message',
      sourceId,
      contentHash: event!.contentHash,
      threadId,
      sessionId: turn.sessionId,
      turnId,
      role: event!.role,
      threadSeq: event!.threadSeq,
      turnSeq: event!.turnSeq,
      eventOrdinal: event!.eventOrdinal,
      parentEventId: event!.parentEventId,
      prevEventId: event!.prevEventId,
      nextEventId: event!.nextEventId,
      causalityType: event!.causalityType,
      orderingConfidence: event!.orderingConfidence,
    }));
    const content = [
      `User: ${turn.userText}`,
      turn.assistantText ? `Agent: ${turn.assistantText}` : '',
    ].filter(Boolean).join('\n');

    const decision = this.shouldCompileTurn(mode, content);
    const rawEventIds = [userEvent, assistantEvent].filter(Boolean).map((event) => event!.eventId);
    if (!decision.compile) {
      return {
        mode,
        reason: decision.reason,
        compiled: false,
        rawEventIds,
      };
    }

    const neuron = await this.kernel.ingest({
      content,
      projectId: turn.projectId,
      createdAt: occurredAt,
      source: sourceId,
      sourceRefs,
      tags: [
        `agent:${turn.agentId}`,
        `session:${turn.sessionId}`,
      ],
    });

    return {
      mode,
      reason: decision.reason,
      compiled: true,
      rawEventIds,
      compiledNeuronId: neuron.id,
    };
  }

  async ingestToolCall(call: AgentToolCallMemory): Promise<MemoryEvent> {
    const threadId = call.threadId || call.sessionId;
    return this.kernel.recordToolCall({
      projectId: call.projectId,
      workspaceId: call.workspaceId,
      threadId,
      sessionId: call.sessionId,
      turnId: call.turnId,
      turnSeq: call.turnSeq,
      assistantEventId: call.assistantEventId,
      toolCallId: call.toolCallId,
      toolName: call.toolName,
      input: call.input,
      eventOrdinal: call.eventOrdinal,
      occurredAt: call.timestamp,
      sourceId: `${call.agentId}:${call.sessionId}`,
      metadata: call.metadata,
    });
  }

  async ingestToolObservation(observation: AgentToolObservationMemory): Promise<MemoryEvent> {
    const threadId = observation.threadId || observation.sessionId;
    const sourceId = `${observation.agentId}:${observation.sessionId}`;
    const event = this.kernel.recordToolResult({
      projectId: observation.projectId,
      workspaceId: observation.workspaceId,
      threadId,
      sessionId: observation.sessionId,
      turnId: observation.turnId,
      turnSeq: observation.turnSeq,
      toolCallEventId: observation.toolCallEventId,
      toolCallId: observation.toolCallId,
      toolName: observation.toolName,
      output: observation.output,
      eventOrdinal: observation.eventOrdinal,
      occurredAt: observation.timestamp,
      sourceId,
      metadata: observation.metadata,
    });

    await this.kernel.ingest({
      content: `Tool ${observation.toolName} result:\n${observation.output}`,
      projectId: observation.projectId,
      createdAt: observation.timestamp ?? event.occurredAt,
      source: sourceId,
      sourceType: 'external_tool',
      type: 'agent_observation',
      sourceRefs: [this.toSourceRef(event, sourceId)],
      tags: [
        `agent:${observation.agentId}`,
        `session:${observation.sessionId}`,
        `tool:${observation.toolName}`,
        'record:tool_result',
      ],
    });

    return event;
  }

  async ingestTaskEvent(task: AgentTaskEventMemory): Promise<MemoryEvent> {
    const threadId = task.threadId || task.sessionId;
    const sourceId = `${task.agentId}:${task.sessionId}`;
    const event = this.kernel.recordTaskEvent({
      projectId: task.projectId,
      workspaceId: task.workspaceId,
      threadId,
      sessionId: task.sessionId,
      turnId: task.turnId,
      turnSeq: task.turnSeq,
      parentEventId: task.parentEventId,
      taskId: task.taskId,
      title: task.title,
      content: task.content,
      eventOrdinal: task.eventOrdinal,
      occurredAt: task.timestamp,
      sourceId,
      metadata: task.metadata,
    });

    await this.kernel.ingest({
      content: `Task event${task.title ? ` (${task.title})` : ''}:\n${task.content}`,
      projectId: task.projectId,
      createdAt: task.timestamp ?? event.occurredAt,
      source: sourceId,
      sourceType: 'llm_inference',
      type: 'agent_observation',
      sourceRefs: [this.toSourceRef(event, sourceId)],
      tags: [
        `agent:${task.agentId}`,
        `session:${task.sessionId}`,
        task.taskId ? `task:${task.taskId}` : 'task:event',
        'record:task_event',
      ],
    });

    return event;
  }

  recall(query: AgentRecallQuery): AgentRecallResult {
    const limit = query.limit ?? 5;
    const retrievalLimit = Math.max(limit * 4, 24);
    const result = this.kernel.navigateMemory(query.query, {
      projectId: query.projectId,
      limit: retrievalLimit,
      startTime: query.startTime,
      endTime: query.endTime,
    });
    const scopedEvidence = this.filterAgentEvidence(result.rawEvidence, query.agentId).slice(0, limit);
    if (scopedEvidence.length > 0) {
      return {
        recallMode: result.recallMode,
        items: scopedEvidence.map((neuron) => this.toAgentRecallItem(neuron)),
        narrative: result.navigation?.narrative,
        pulseTrace: result.navigation?.pulse.trace,
        temporalTraversal: result.navigation?.branchSearch.temporalTraversal,
        runtime: result.navigation?.runtime,
        fallbackUsed: result.fallbackUsed,
      };
    }

    const fallback = this.kernel.recall(query.query, {
      projectId: query.projectId,
      limit: retrievalLimit,
    });
    const fallbackItems = this.filterAgentEvidence(fallback.rawEvidence, query.agentId)
      .slice(0, limit)
      .map((neuron) => this.toAgentRecallItem(neuron));
    if (fallbackItems.length > 0) {
      return {
        recallMode: 'brain_recall_fallback',
        items: fallbackItems,
        narrative: result.navigation?.narrative,
        pulseTrace: result.navigation?.pulse.trace,
        temporalTraversal: result.navigation?.branchSearch.temporalTraversal,
        runtime: result.navigation?.runtime,
        fallbackUsed: true,
      };
    }

    const rawEvents = this.kernel.searchRawEvents(query.query, {
      projectId: query.projectId,
      startTime: query.startTime,
      endTime: query.endTime,
      limit: Math.max(limit * 2, 10),
    });
    const rawItems = rawEvents
      .filter((event) => this.isAgentRawEvent(event, query.agentId))
      .filter((event) => !this.isOperationalNoiseRawEvent(event))
      .slice(0, limit)
      .map((event) => this.toAgentRawRecallItem(event));

    return {
      recallMode: 'raw_ledger_fallback',
      items: rawItems,
      narrative: result.navigation?.narrative,
      pulseTrace: result.navigation?.pulse.trace,
      temporalTraversal: result.navigation?.branchSearch.temporalTraversal,
      runtime: result.navigation?.runtime,
      fallbackUsed: true,
    };
  }

  private filterAgentEvidence(
    neurons: MemoryKernelNavigationResult['rawEvidence'],
    agentId: string
  ): MemoryKernelNavigationResult['rawEvidence'] {
    return neurons.filter((neuron) => {
      if (!isRecallableMemoryEvidence(neuron)) return false;
      const tags = neuron.metadata.tags || [];
      const explicitAgentTags = tags.filter((tag) => tag.startsWith('agent:'));
      if (explicitAgentTags.length === 0) return true;
      return explicitAgentTags.includes(`agent:${agentId}`) || tags.includes(agentId);
    });
  }

  private toAgentRecallItem(neuron: MemoryKernelNavigationResult['rawEvidence'][number]): AgentRecallItem {
    return {
      id: neuron.id,
      text: neuron.content,
      projectId: neuron.metadata.projectId,
      topicPath: neuron.metadata.topicPath,
      tags: neuron.metadata.tags || [],
      source: neuron.metadata.filePath || neuron.metadata.sourceEventId,
    };
  }

  private isAgentRawEvent(event: MemoryEvent, agentId: string): boolean {
    if (!event.sourceId) return true;
    return event.sourceId === agentId || event.sourceId.startsWith(`${agentId}:`);
  }

  private isOperationalNoiseRawEvent(event: MemoryEvent): boolean {
    const payload = event.payload as { text?: unknown; metadata?: Record<string, unknown> };
    const tags = Array.isArray(payload.metadata?.tags) ? payload.metadata.tags : [];
    if (tags.some((tag) => (
      tag === 'operational_noise'
      || tag === 'record:heartbeat'
      || tag === 'system:heartbeat'
      || tag === 'routine:heartbeat'
    ))) {
      return true;
    }
    return isOperationalNoiseText(typeof payload.text === 'string' ? payload.text : JSON.stringify(event.payload));
  }

  private toAgentRawRecallItem(event: MemoryEvent): AgentRecallItem {
    const payload = event.payload as { text?: unknown };
    const tags = [
      'raw_ledger',
      event.rawEventType ? `raw:${event.rawEventType}` : '',
      event.role ? `role:${event.role}` : '',
      event.sessionId ? `session:${event.sessionId}` : '',
    ].filter(Boolean);
    return {
      id: event.eventId,
      text: typeof payload.text === 'string' ? payload.text : JSON.stringify(event.payload),
      projectId: event.projectId,
      tags,
      source: event.eventId,
    };
  }

  private toSourceRef(event: MemoryEvent, sourceId: string): MemorySourceRef {
    return {
      eventId: event.eventId,
      eventType: event.rawEventType || event.eventType,
      sourceId,
      contentHash: event.contentHash,
      threadId: event.threadId,
      sessionId: event.sessionId,
      turnId: event.turnId,
      role: event.role,
      threadSeq: event.threadSeq,
      turnSeq: event.turnSeq,
      eventOrdinal: event.eventOrdinal,
      parentEventId: event.parentEventId,
      prevEventId: event.prevEventId,
      nextEventId: event.nextEventId,
      causalityType: event.causalityType,
      orderingConfidence: event.orderingConfidence,
    };
  }

  private shouldCompileTurn(
    mode: AgentTurnIngestMode,
    content: string,
  ): { compile: boolean; reason: AgentTurnCompileReason } {
    if (mode === 'immediate_compile') return { compile: true, reason: 'immediate_compile' };
    if (mode === 'raw_archive_only') return { compile: false, reason: 'raw_archive_only' };
    if (mode === 'raw_then_dream') return { compile: false, reason: 'raw_then_dream' };
    if (this.hasDurableTurnSignal(content)) return { compile: true, reason: 'durable_signal_detected' };
    return { compile: false, reason: 'low_signal_turn' };
  }

  private hasDurableTurnSignal(content: string): boolean {
    const normalized = content.toLowerCase();
    const durableSignals = [
      /重要/,
      /记住/,
      /以后/,
      /长期/,
      /偏好/,
      /不要/,
      /禁止/,
      /必须/,
      /约束/,
      /边界/,
      /目标/,
      /纠正/,
      /更正/,
      /推翻/,
      /失败/,
      /成功/,
      /教训/,
      /流程/,
      /决定/,
      /架构/,
      /原则/,
      /preference/,
      /remember/,
      /important/,
      /always/,
      /never/,
      /must/,
      /do not/,
      /constraint/,
      /goal/,
      /correction/,
      /supersede/,
      /failure/,
      /lesson/,
      /decision/,
      /architecture/,
      /boundary/,
    ];
    return durableSignals.some((signal) => signal.test(normalized));
  }
}
