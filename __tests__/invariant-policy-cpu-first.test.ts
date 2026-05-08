import { describe, expect, it } from 'bun:test';
import { IterativeLLMClarifier, type BrainToolDispatcherLike } from '../src/routing/IterativeLLMClarifier.js';
import type { BrainRecallResult } from '../src/recall/BrainRecall.js';
import type { BrainToolCall, BrainToolResult } from '../src/routing/LLMToolSchema.js';
import type { PolicyDecision, ToolUsePolicyContext } from '../src/routing/ToolUsePolicy.js';

function recall(): BrainRecallResult {
  return {
    query: 'bluetooth headset issue',
    strategy: { primaryLevel: 'compiled_memory', fallbackUsed: false },
    compiledMemory: { beliefs: [], facts: [], events: [], entityTimeline: [] },
    rawEvidence: [],
    fallbackSnippets: [],
    profileSignals: [],
    profileSurface: { userProfile: [], agentPersona: [] },
  };
}

function approvingDispatcher(order: string[] = [], calls: BrainToolCall[] = []): BrainToolDispatcherLike {
  return {
    async dispatch(call: BrainToolCall): Promise<BrainToolResult> {
      order.push('dispatch');
      calls.push({ ...call });
      return {
        toolName: call.action,
        callId: `call-${calls.length}`,
        success: true,
        result: { facts: [{ factId: `f-${calls.length}`, subject: 'bluetooth', predicateFamily: 'issue', object: 'dropout' }], events: [] },
        durationMs: 1,
      };
    },
  };
}

function policy(decide: (call: BrainToolCall, ctx: ToolUsePolicyContext) => PolicyDecision, order: string[] = []) {
  return {
    evaluate(call: BrainToolCall, ctx: ToolUsePolicyContext): PolicyDecision {
      order.push('policy');
      return decide(call, ctx);
    },
  };
}

describe('Phase 57 invariant: ToolUsePolicy is CPU-first', () => {
  it('evaluates policy before dispatching a tool call', async () => {
    const order: string[] = [];
    const clarifier = new IterativeLLMClarifier(
      async () => JSON.stringify({ action: 'brain_recall', query: 'bluetooth headset issue' }),
      approvingDispatcher(order),
      { maxIterations: 1, policy: policy((call) => ({ verdict: 'approve', call }), order) as never }
    );
    await clarifier.clarify('bluetooth headset issue', recall());
    expect(order).toEqual(['policy', 'dispatch']);
  });

  it('does not dispatch when policy rejects', async () => {
    const order: string[] = [];
    const calls: BrainToolCall[] = [];
    const clarifier = new IterativeLLMClarifier(
      async () => JSON.stringify({ action: 'brain_recall', query: 'bluetooth headset issue' }),
      approvingDispatcher(order, calls),
      { maxIterations: 1, policy: policy(() => ({ verdict: 'reject', reason: 'blocked' }), order) as never }
    );
    const result = await clarifier.clarify('bluetooth headset issue', recall());
    expect(calls).toHaveLength(0);
    expect(result.stoppedByPolicy).toBe(true);
    expect(order).toEqual(['policy']);
  });

  it('dispatches rewritten call rather than the LLM proposal', async () => {
    const calls: BrainToolCall[] = [];
    const clarifier = new IterativeLLMClarifier(
      async () => JSON.stringify({ action: 'brain_recall', query: 'raw query', limit: 10 }),
      approvingDispatcher([], calls),
      {
        maxIterations: 1,
        policy: policy(() => ({ verdict: 'rewrite', call: { action: 'brain_recall', query: 'rewritten query', limit: 1 }, reason: 'narrowed' })) as never,
      }
    );
    await clarifier.clarify('bluetooth headset issue', recall());
    expect(calls[0]).toMatchObject({ action: 'brain_recall', query: 'rewritten query', limit: 1 });
  });

  it('keeps no-policy path backward compatible', async () => {
    const calls: BrainToolCall[] = [];
    const clarifier = new IterativeLLMClarifier(
      async () => JSON.stringify({ action: 'brain_recall', query: 'bluetooth headset issue' }),
      approvingDispatcher([], calls),
      { maxIterations: 1 }
    );
    const result = await clarifier.clarify('bluetooth headset issue', recall());
    expect(calls).toHaveLength(1);
    expect(result.toolCallLog).toHaveLength(1);
  });

  it('passes CPU projectId into policy context before dispatch', async () => {
    let seenProjectId: string | undefined;
    const clarifier = new IterativeLLMClarifier(
      async () => JSON.stringify({ action: 'brain_recall', query: 'bluetooth headset issue' }),
      approvingDispatcher(),
      {
        maxIterations: 1,
        projectId: 'workspace-A',
        policy: policy((call, ctx) => {
          seenProjectId = ctx.projectId;
          return { verdict: 'approve', call };
        }) as never,
      }
    );
    await clarifier.clarify('bluetooth headset issue', recall());
    expect(seenProjectId).toBe('workspace-A');
  });

  it('does not dispatch rejected calls across multiple iterations', async () => {
    const calls: BrainToolCall[] = [];
    let llmCalls = 0;
    const clarifier = new IterativeLLMClarifier(
      async () => {
        llmCalls++;
        return JSON.stringify({ action: 'brain_recall', query: `bluetooth ${llmCalls}` });
      },
      approvingDispatcher([], calls),
      { maxIterations: 3, policy: policy(() => ({ verdict: 'reject', reason: 'always blocked' })) as never }
    );
    const result = await clarifier.clarify('bluetooth headset issue', recall());
    expect(calls).toHaveLength(0);
    expect(result.iterationsUsed).toBe(1);
    expect(result.stoppedByPolicy).toBe(true);
  });

  it('records policy rewrite event before tool-called event', async () => {
    const events: string[] = [];
    const bus = { emit: (event: { eventType: string }) => events.push(event.eventType) };
    const clarifier = new IterativeLLMClarifier(
      async () => JSON.stringify({ action: 'brain_recall', query: 'raw' }),
      approvingDispatcher(),
      {
        maxIterations: 1,
        boardEventBus: bus as never,
        policy: policy(() => ({ verdict: 'rewrite', call: { action: 'brain_recall', query: 'bluetooth headset issue' }, reason: 'safe' })) as never,
      }
    );
    await clarifier.clarify('bluetooth headset issue', recall());
    expect(events.indexOf('llm_iteration.policy_rewritten')).toBeLessThan(events.indexOf('llm_iteration.tool_called'));
  });

  it('treats parser-null output as final answer without policy or dispatch', async () => {
    const order: string[] = [];
    const clarifier = new IterativeLLMClarifier(
      async () => 'final answer',
      approvingDispatcher(order),
      { maxIterations: 1, policy: policy((call) => ({ verdict: 'approve', call }), order) as never }
    );
    const result = await clarifier.clarify('bluetooth headset issue', recall());
    expect(order).toEqual([]);
    expect(result.finalAnswer).toBe('final answer');
  });
});
