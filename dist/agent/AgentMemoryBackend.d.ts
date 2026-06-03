import type { MemoryKernel, MemoryKernelNavigationResult } from '../factory.js';
import type { MemoryEvent } from '../types/index.js';
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
    metadata?: Record<string, unknown>;
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
    recallMode: MemoryKernelNavigationResult['recallMode'];
    items: AgentRecallItem[];
    narrative?: NonNullable<MemoryKernelNavigationResult['navigation']>['narrative'];
    pulseTrace?: NonNullable<MemoryKernelNavigationResult['navigation']>['pulse']['trace'];
    temporalTraversal?: NonNullable<MemoryKernelNavigationResult['navigation']>['branchSearch']['temporalTraversal'];
    runtime?: NonNullable<MemoryKernelNavigationResult['navigation']>['runtime'];
    fallbackUsed: boolean;
}
export declare class KernelAgentMemoryBackend {
    private readonly kernel;
    constructor(kernel: MemoryKernel);
    rememberTurn(turn: AgentTurnMemory): Promise<void>;
    ingestToolCall(call: AgentToolCallMemory): Promise<MemoryEvent>;
    ingestToolObservation(observation: AgentToolObservationMemory): Promise<MemoryEvent>;
    ingestTaskEvent(task: AgentTaskEventMemory): Promise<MemoryEvent>;
    recall(query: AgentRecallQuery): AgentRecallResult;
    private filterAgentEvidence;
    private toAgentRecallItem;
    private toSourceRef;
}
//# sourceMappingURL=AgentMemoryBackend.d.ts.map