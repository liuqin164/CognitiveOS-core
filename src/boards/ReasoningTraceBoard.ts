import type { Board, BoardSnapshot, BoardSnapshotOptions, BoardEvent } from './Board.js';
import { BoardEventBus } from './BoardEventBus.js';

const REASONING_EVENT_PREFIX = 'llm_iteration.';

export class ReasoningTraceBoard implements Board {
  readonly id = 'reasoning_trace';
  readonly description = 'LLM iterative reasoning and tool call trace';

  constructor(private readonly eventBus: BoardEventBus = new BoardEventBus()) {}

  async snapshot(options: BoardSnapshotOptions = {}): Promise<BoardSnapshot> {
    const limit = options.limit ?? 100;
    const events = this.eventBus
      .getRecentEvents(limit)
      .filter((event) => event.boardId === this.id || event.eventType.startsWith(REASONING_EVENT_PREFIX))
      .filter((event) => options.since === undefined || event.timestamp >= options.since);

    return {
      boardId: this.id,
      capturedAt: Date.now(),
      data: {
        events,
        iterationCount: events.filter((event) => event.eventType === 'llm_iteration.started').length,
        toolCallCount: events.filter((event) => event.eventType === 'llm_iteration.tool_called').length,
        policyRejectionCount: events.filter((event) => event.eventType === 'llm_iteration.policy_rejected').length,
      },
    };
  }

  stream(callback: (event: BoardEvent) => void): () => void {
    return this.eventBus.subscribeAll((event) => {
      if (event.boardId === this.id || event.eventType.startsWith(REASONING_EVENT_PREFIX)) {
        callback(event);
      }
    });
  }
}
