import { describe, expect, test } from 'bun:test';
import { DirectReplyFormatter } from '../src/routing/DirectReplyFormatter.js';
import { MessageRouter } from '../src/routing/MessageRouter.js';
import type { IntentClassificationResult } from '../src/routing/SystemIntentClassifier.js';

describe('MessageRouter', () => {
  test('routes fast-path intents through dispatch and formatter', async () => {
    const classifier = {
      classify(): IntentClassificationResult {
        return { intent: 'system_query.tasks', confidence: 1 };
      }
    };
    const managers = {
      async dispatch() {
        return [{ taskId: 'task-1', goalDescription: '检查路由', status: 'running' }];
      }
    };
    const router = new MessageRouter(
      classifier as any,
      managers as any,
      new DirectReplyFormatter()
    );

    const result = await router.route('list tasks');

    expect(result.path).toBe('fast');
    expect(result.intent).toBe('system_query.tasks');
    expect(result.reply).toContain('检查路由');
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
  });

  test('returns slow-path result without dispatching', async () => {
    let dispatched = false;
    const classifier = {
      classify(): IntentClassificationResult {
        return { intent: 'reasoning_required', confidence: 1 };
      }
    };
    const managers = {
      async dispatch() {
        dispatched = true;
        return [];
      }
    };
    const router = new MessageRouter(
      classifier as any,
      managers as any,
      new DirectReplyFormatter()
    );

    const result = await router.route('帮我想想下一步怎么做');

    expect(result.path).toBe('slow');
    expect(result.intent).toBe('reasoning_required');
    expect(result.reply).toBe('');
    expect(dispatched).toBe(false);
  });

  test('returns graceful unavailable reply when dispatch returns null', async () => {
    const classifier = {
      classify(): IntentClassificationResult {
        return { intent: 'system_query.trace', confidence: 1 };
      }
    };
    const managers = {
      async dispatch() {
        return null;
      }
    };
    const router = new MessageRouter(
      classifier as any,
      managers as any,
      new DirectReplyFormatter()
    );

    const result = await router.route('explain your decision');

    expect(result.path).toBe('fast');
    expect(result.reply).toBe('（该功能暂不可用）');
  });
});
