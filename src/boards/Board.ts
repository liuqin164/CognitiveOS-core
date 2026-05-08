export interface BoardSnapshotOptions {
  limit?: number;
  since?: number;
}

export interface BoardSnapshot {
  boardId: string;
  capturedAt: number;
  data: Record<string, unknown>;
}

export interface BoardEvent {
  boardId: string;
  eventType:
    | 'task_created'
    | 'task_updated'
    | 'memory_ingested'
    | 'approval_pending'
    | 'approval_resolved'
    | 'process_started'
    | 'process_finished'
    | 'context_updated'
    | 'workspace_switched'
    | 'proposal.created'
    | 'proposal.eval_started'
    | 'proposal.eval_result'
    | 'proposal.approved'
    | 'proposal.applied'
    | 'proposal.rolled_back'
    | 'llm_iteration.started'
    | 'llm_iteration.tool_called'
    | 'llm_iteration.policy_rejected'
    | 'llm_iteration.policy_rewritten'
    | 'llm_iteration.budget_compressed'
    | 'llm_iteration.completed'
    | 'recall_gate.skip'
    | 'recall_gate.escalation'
    | 'autonomy.action_approved'
    | 'autonomy.action_rejected'
    | 'autonomy.batch_collected'
    | 'autonomy.budget_exhausted';
  payload: unknown;
  timestamp: number;
  workspaceId?: string;
}

export interface Board {
  readonly id: string;
  readonly description: string;
  snapshot(options?: BoardSnapshotOptions): Promise<BoardSnapshot>;
  stream(callback: (event: BoardEvent) => void): () => void;
}
