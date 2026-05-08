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
    compiledMemory: {
      beliefs: [],
      facts: [{ factId: 'initial-f', neuronId: 'initial-n', subject: 'q', predicateFamily: 'is', object: 'known', validFrom: 1, certaintyLevel: 'certain', confidence: 1, status: 'verified', sourceText: 'known' }],
      events: [],
      entityTimeline: [],
    },
    rawEvidence: [{ id: 'initial-n' } as never],
    fallbackSnippets: [],
    profileSignals: [],
    profileSurface: { userProfile: [], agentPersona: [] },
  };
}

function dispatcher(): BrainToolDispatcherLike {
  return {
    async dispatch(call: BrainToolCall): Promise<BrainToolResult> {
      return {
        toolName: call.action,
        callId: 'tool-call-1',
        success: true,
        result: { facts: [{ factId: 'tool-f', neuronId: 'tool-n', subject: 'q', predicateFamily: 'adds', object: 'detail', validFrom: 1, certaintyLevel: 'certain', confidence: 1, status: 'verified', sourceText: 'detail' }], events: [] },
        durationMs: 1,
      };
    },
  };
}

describe('Phase 58 invariant: ReasoningTraceBoard readonly and evidence trace trustworthy', () => {
  it('snapshot never calls BoardEventBus.emit', async () => {
    const bus = new BoardEventBus();
    let emitCount = 0;
    const originalEmit = bus.emit.bind(bus);
    bus.emit = (event) => {
      emitCount++;
      return originalEmit(event);
    };
    const board = new ReasoningTraceBoard(bus);
    await board.snapshot();
    expect(emitCount).toBe(0);
  });

  it('stream subscription never calls BoardEventBus.emit', () => {
    const bus = new BoardEventBus();
    let emitCount = 0;
    const originalEmit = bus.emit.bind(bus);
    bus.emit = (event) => {
      emitCount++;
      return originalEmit(event);
    };
    const board = new ReasoningTraceBoard(bus);
    const unsubscribe = board.stream(() => {});
    unsubscribe();
    expect(emitCount).toBe(0);
  });

  it('snapshot is pure read for repeated calls', async () => {
    const bus = new BoardEventBus();
    bus.emit({ boardId: 'reasoning_trace', eventType: 'llm_iteration.started', payload: {}, timestamp: 1 });
    const board = new ReasoningTraceBoard(bus);
    const first = await board.snapshot();
    const second = await board.snapshot();
    expect(first.data).toEqual(second.data);
  });

  it('Clarifier, not board, emits iteration event sequence', async () => {
    const bus = new BoardEventBus();
    const board = new ReasoningTraceBoard(bus);
    const clarifier = new IterativeLLMClarifier(
      async () => JSON.stringify({ action: 'brain_recall', query: 'q' }),
      dispatcher(),
      { maxIterations: 1, boardEventBus: bus }
    );
    await clarifier.clarify('q', recall());
    const snapshot = await board.snapshot();
    const eventTypes = (snapshot.data.events as { eventType: string }[]).map((event) => event.eventType);
    expect(eventTypes).toEqual(['llm_iteration.started', 'llm_iteration.tool_called', 'llm_iteration.completed']);
  });

  it('AnswerEvidenceTrace toolCallIds match real tool call log', async () => {
    const clarifier = new IterativeLLMClarifier(
      async () => JSON.stringify({ action: 'brain_recall', query: 'q' }),
      dispatcher(),
      { maxIterations: 1 }
    );
    const result = await clarifier.clarify('q', recall());
    expect(result.evidenceTrace.toolCallIds).toEqual(result.toolCallLog.map((entry) => entry.result.callId));
  });

  it('AnswerEvidenceTrace includes initial recall and tool evidence refs', async () => {
    const clarifier = new IterativeLLMClarifier(
      async () => JSON.stringify({ action: 'brain_recall', query: 'q' }),
      dispatcher(),
      { maxIterations: 1 }
    );
    const result = await clarifier.clarify('q', recall());
    expect(result.evidenceTrace.evidenceRefs.map((ref) => ref.source)).toEqual(['initial_recall', 'brain_recall']);
    expect(result.evidenceTrace.evidenceRefs[0].factIds).toContain('initial-f');
    expect(result.evidenceTrace.evidenceRefs[1].factIds).toContain('tool-f');
  });

  it('AnswerEvidenceTrace mirrors iteration and stop flags', async () => {
    const clarifier = new IterativeLLMClarifier(
      async () => JSON.stringify({ action: 'brain_recall', query: 'q' }),
      dispatcher(),
      { maxIterations: 1 }
    );
    const result = await clarifier.clarify('q', recall());
    expect(result.evidenceTrace.iterationCount).toBe(result.iterationsUsed);
    expect(result.evidenceTrace.stoppedByPolicy).toBe(result.stoppedByPolicy);
    expect(result.evidenceTrace.stoppedByMaxIter).toBe(result.stoppedByMaxIter);
  });
});
