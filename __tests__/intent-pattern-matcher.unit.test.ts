// @ts-nocheck
import { describe, expect, test } from 'bun:test';
import {
  IntentPatternMatcher,
  SYSTEM_INTENT_PATTERNS,
  SYSTEM_INTENT_PRIORITY
} from '../src/routing/IntentPatternMatcher.js';
import type { SystemIntent } from '../src/routing/SystemIntentClassifier.js';

describe('IntentPatternMatcher', () => {
  const matcher = new IntentPatternMatcher();

  test('match returns null for unknown input', () => {
    expect(matcher.match('帮我分析一下这个设计')).toBeNull();
    expect(matcher.match('tell me something interesting')).toBeNull();
  });

  const firstPatternExamples: Record<Exclude<SystemIntent, 'reasoning_required'>, string> = {
    'system_query.tasks': '现在有什么任务',
    'system_query.approvals': '有什么需要确认的',
    'system_query.contradictions': '有没有矛盾待确认',
    'system_query.capabilities': '你能做什么',
    'system_query.environment': '你当前的环境是什么',
    'system_query.models': '你用什么模型',
    'system_query.file_assets': '你能读PDF文件吗',
    'system_query.self_manifest': '运行时自我清单',
    'system_query.memory_recent': '最近记住了什么',
    'system_query.memory_search': '我之前提过Atlas吗',
    'system_query.important_memories': '有哪些重要的记忆',
    'system_query.context': '你这轮用了多少上下文',
    'system_query.trace': '你为什么这么决定',
    'system_command.approve': '确认部署 api-server',
    'system_command.reject': '取消那个部署',
    'system_command.resume': '继续刚才的',
    'system_command.cancel_task': '停掉任务A12',
    'system_command.mark_permanent': '永久记住刚才说的',
    'system_command.mark_important': '记住这个，很重要',
    'system_command.unmark_important': '这个不用一直记',
    'system_confirmation.yes_no': '是'
  };

  for (const intent of SYSTEM_INTENT_PRIORITY) {
    test(`first pattern for ${intent} matches its expected input`, () => {
      const firstPattern = SYSTEM_INTENT_PATTERNS[intent][0];
      expect(firstPattern.test(firstPatternExamples[intent])).toBe(true);
    });
  }

  test('approve patterns do not cross-fire on reject input', () => {
    for (const pattern of SYSTEM_INTENT_PATTERNS['system_command.approve']) {
      expect(pattern.test('取消那个部署')).toBe(false);
      expect(pattern.test('reject deployment')).toBe(false);
    }
  });

  test('reject patterns do not cross-fire on approve input', () => {
    for (const pattern of SYSTEM_INTENT_PATTERNS['system_command.reject']) {
      expect(pattern.test('确认部署 api-server')).toBe(false);
      expect(pattern.test('approve deployment')).toBe(false);
    }
  });

  test('command priority beats confirmation priority', () => {
    expect(matcher.match('yes deploy api-server')?.intent).toBe('system_command.approve');
    expect(matcher.match('no cancel')?.intent).toBe('system_command.reject');
  });

  test('confirmation patterns match isolated yes/no responses', () => {
    expect(matcher.match('yes')?.intent).toBe('system_confirmation.yes_no');
    expect(matcher.match('不')?.intent).toBe('system_confirmation.yes_no');
  });

  test('environment patterns cover natural network permission variants', () => {
    const examples = [
      '你能不能联网',
      '你有没有网络权限',
      '网络可用吗',
      '是否可以上网',
      'can you browse',
      'do you have internet access',
      'can you use the internet'
    ];

    for (const example of examples) {
      expect(matcher.match(example)?.intent).toBe('system_query.environment');
    }
  });

  test('match returns the matched pattern object for a known input', () => {
    const result = matcher.match('show me the trace');

    expect(result?.intent).toBe('system_query.trace');
    expect(result?.pattern).toBeDefined();
    expect(result?.pattern.test('show me the trace')).toBe(true);
  });
});
