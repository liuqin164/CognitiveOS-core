import type { MemoryKernel, MemoryKernelNavigationResult } from '../factory.js';
export interface AgentTurnMemory {
    agentId: string;
    projectId: string;
    sessionId: string;
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
    recall(query: AgentRecallQuery): AgentRecallResult;
    private filterAgentEvidence;
    private toAgentRecallItem;
}
//# sourceMappingURL=AgentMemoryBackend.d.ts.map