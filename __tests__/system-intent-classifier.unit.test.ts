import { describe, expect, test } from 'bun:test';
import { ConfirmationPhraseMatcher } from '../src/routing/ConfirmationPhraseMatcher.js';
import { SystemIntentClassifier, type SystemIntent } from '../src/routing/SystemIntentClassifier.js';

const classifier = new SystemIntentClassifier();

function expectIntent(message: string, intent: SystemIntent): void {
  const result = classifier.classify(message);
  expect(result.intent).toBe(intent);
  expect(result.confidence).toBeGreaterThanOrEqual(0);
  expect(result.confidence).toBeLessThanOrEqual(1);
  if (intent === 'reasoning_required') {
    expect(result.matchedPattern).toBeUndefined();
  } else {
    expect(result.matchedPattern).toBeString();
    expect(result.matchedPattern!.length).toBeGreaterThan(0);
  }
}

describe('SystemIntentClassifier', () => {
  const bilingualCases: Array<{ intent: SystemIntent; samples: string[] }> = [
    {
      intent: 'system_query.tasks',
      samples: [
        '现在有什么任务',
        '任务状态是什么',
        '有哪些工作在运行',
        'list tasks',
        'what tasks are running',
        'show me tasks'
      ]
    },
    {
      intent: 'system_query.approvals',
      samples: [
        '有什么需要确认的',
        '待确认事项有哪些',
        '现在有等待审批的吗',
        'pending approvals',
        'what needs my approval',
        'show me approvals'
      ]
    },
    {
      intent: 'system_query.contradictions',
      samples: [
        '有没有矛盾待确认',
        '记忆有没有冲突',
        '我需要确认什么',
        'pending memory contradictions',
        'conflicting facts'
      ]
    },
    {
      intent: 'system_query.capabilities',
      samples: [
        '你能做什么',
        '你可以执行什么',
        '有哪些能力和工具',
        'what can you do',
        'list your capabilities',
        'available tools'
      ]
    },
    {
      intent: 'system_query.memory_recent',
      samples: [
        '最近记住了什么',
        '你最近记录了哪些东西',
        '你记了什么',
        'what did you remember',
        'recent memories',
        'show me recent memory'
      ]
    },
    {
      intent: 'system_query.memory_search',
      samples: [
        '我之前提过项目代号吗',
        '我以前说过Atlas吗',
        '你记得关于支付网关吗',
        'did I ever mention Atlas',
        'do you remember payment migration',
        'search memory for api-server'
      ]
    },
    {
      intent: 'system_query.context',
      samples: [
        '你这轮用了多少上下文',
        '当前上下文用量多大',
        '这次消耗了几个token',
        'how much context',
        'context window usage',
        'token count'
      ]
    },
    {
      intent: 'system_query.trace',
      samples: [
        '你为什么这么决定',
        '这个决定的依据是什么',
        '解释一下你的判断',
        'why did you decide that',
        'explain your decision',
        'show me the trace'
      ]
    },
    {
      intent: 'system_command.approve',
      samples: [
        '确认部署 api-server',
        '批准本次发布',
        '好的，继续',
        'approve deployment',
        'yes deploy api-server',
        'go ahead'
      ]
    },
    {
      intent: 'system_command.reject',
      samples: [
        '取消那个部署',
        '拒绝这次发布',
        '不要执行',
        'reject deployment',
        'cancel it',
        'no cancel'
      ]
    },
    {
      intent: 'system_command.resume',
      samples: [
        '继续刚才的',
        '恢复之前未完成的',
        '接着执行',
        'resume',
        'continue the previous task',
        'resume the last task'
      ]
    },
    {
      intent: 'system_command.cancel_task',
      samples: [
        '停掉任务A12',
        '取消任务 id123',
        '停止这个工作流任务',
        'cancel task A12',
        'stop task worker-9',
        'kill job sync-3'
      ]
    },
    {
      intent: 'system_confirmation.yes_no',
      samples: ['是', '否', '确认', 'yes', 'no', 'y']
    }
  ];

  for (const { intent, samples } of bilingualCases) {
    for (const sample of samples) {
      test(`classifies "${sample}" as ${intent}`, () => {
        expectIntent(sample, intent);
      });
    }
  }

  test('returns reasoning_required for empty string', () => {
    expectIntent('', 'reasoning_required');
  });

  test('returns reasoning_required for whitespace only', () => {
    expectIntent('   ', 'reasoning_required');
  });

  test('handles single-character n as yes/no confirmation', () => {
    expectIntent('n', 'system_confirmation.yes_no');
  });

  test('handles punctuation-heavy yes confirmation', () => {
    expectIntent('yes!!!', 'system_confirmation.yes_no');
  });

  test('handles punctuation-heavy no confirmation', () => {
    expectIntent('不。。。', 'system_confirmation.yes_no');
  });

  test('returns reasoning_required for ambiguous general help', () => {
    expectIntent('帮我想想下一步怎么做', 'reasoning_required');
  });

  test('returns reasoning_required for ambiguous status query', () => {
    expectIntent('现在怎么样了', 'reasoning_required');
  });

  test('returns reasoning_required for ambiguous approval-ish phrase without action', () => {
    expectIntent('这个可以吗', 'reasoning_required');
  });

  test('approve command wins over plain yes/no confirmation', () => {
    expectIntent('yes deploy prod-api', 'system_command.approve');
  });

  test('reject command wins over plain yes/no confirmation', () => {
    expectIntent('no cancel the deployment', 'system_command.reject');
  });

  test('classify is synchronous and typically sub-5ms', () => {
    const startedAt = performance.now();
    const result = classifier.classify('what can you do');
    const elapsedMs = performance.now() - startedAt;

    expect(result.intent).toBe('system_query.capabilities');
    expect(elapsedMs).toBeLessThan(5);
  });
});

describe('ConfirmationPhraseMatcher', () => {
  const matcher = new ConfirmationPhraseMatcher();

  test('extracts approve subject from Chinese phrase', () => {
    expect(matcher.matchConfirmation('确认部署 api-server')).toEqual({
      action: 'approve',
      subject: 'api-server'
    });
  });

  test('extracts reject subject from English phrase', () => {
    expect(matcher.matchConfirmation('cancel deployment billing-worker')).toEqual({
      action: 'reject',
      subject: 'billing-worker'
    });
  });

  test('returns null for non-confirmation phrase', () => {
    expect(matcher.matchConfirmation('what tasks are running')).toBeNull();
  });
});
