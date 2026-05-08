import { describe, expect, it } from 'bun:test';
import { BoardEventBus } from '../src/boards/BoardEventBus.js';
import { ReasoningTraceBoard } from '../src/boards/ReasoningTraceBoard.js';
import { IterativeLLMClarifier, type BrainToolDispatcherLike } from '../src/routing/IterativeLLMClarifier.js';
import type { BrainRecallResult } from '../src/recall/BrainRecall.js';
import type { BrainToolCall, BrainToolResult } from '../src/routing/LLMToolSchema.js';

function recall(): BrainRecallResult {
  return {
    query: 'q',
    strategy: { primaryLevel: 'compiled_memory', fallbackUsed: false },
    compiledMemory: { beliefs: [], facts: [], events: [], entityTimeline: [] },
    rawEvidence: [],
    fallbackSnippets: [],
    profileSignals: [],
    profileSurface: { userProfile: [], agentPersona: [] },
  };
}

function dispatcher(): BrainToolDispatcherLike {
  return {
    async dispatch(call: BrainToolCall): Promise<BrainToolResult> {
      return { toolName: call.action, callId: 'c1', success: true, result: { facts: [], events: [] }, durationMs: 1 };
    },
  };
}

describe('ReasoningTraceBoard', () => {
  it('snapshot includes emitted iteration events', async () => {
    const bus = new BoardEventBus();
    const board = new ReasoningTraceBoard(bus);
    bus.emit({ boardId: 'reasoning_trace', eventType: 'llm_iteration.started', payload: {}, timestamp: Date.now() });
    const snapshot = await board.snapshot();
    expect((snapshot.data.events as unknown[])).toHaveLength(1);
  });

  it('stream receives llm iteration events', () => {
    const bus = new BoardEventBus();
    const board = new ReasoningTraceBoard(bus);
    const seen: string[] = [];
    const unsubscribe = board.stream((event) => seen.push(event.eventType));
    bus.emit({ boardId: 'reasoning_trace', eventType: 'llm_iteration.completed', payload: {}, timestamp: Date.now() });
    unsubscribe();
    expect(seen).toEqual(['llm_iteration.completed']);
  });

  it('snapshot counts tool calls and policy rejections', async () => {
    const bus = new BoardEventBus();
    const board = new ReasoningTraceBoard(bus);
    bus.emit({ boardId: 'reasoning_trace', eventType: 'llm_iteration.tool_called', payload: {}, timestamp: Date.now() });
    bus.emit({ boardId: 'reasoning_trace', eventType: 'llm_iteration.policy_rejected', payload: {}, timestamp: Date.now() });
    const snapshot = await board.snapshot();
    expect(snapshot.data.toolCallCount).toBe(1);
    expect(snapshot.data.policyRejectionCount).toBe(1);
  });

  it('clarifier emits reasoning events', async () => {
    const bus = new BoardEventBus();
    const clarifier = new IterativeLLMClarifier(
      async () => JSON.stringify({ action: 'brain_recall', query: 'q' }),
      dispatcher(),
      { maxIterations: 1, boardEventBus: bus }
    );
    await clarifier.clarify('q', recall());
    const eventTypes = bus.getRecentEvents().map((event) => event.eventType);
    expect(eventTypes).toContain('llm_iteration.started');
    expect(eventTypes).toContain('llm_iteration.tool_called');
  });

  it('evidence trace records tool source', async () => {
    const clarifier = new IterativeLLMClarifier(
      async () => JSON.stringify({ action: 'brain_recall', query: 'q' }),
      dispatcher(),
      { maxIterations: 1 }
    );
    const result = await clarifier.clarify('q', recall());
    expect(result.evidenceTrace.evidenceRefs.some((ref) => ref.source === 'brain_recall')).toBe(true);
  });
});
