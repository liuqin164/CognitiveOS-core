import { describe, expect, test } from 'bun:test';
import { DirectReplyFormatter } from '../src/routing/DirectReplyFormatter.js';

describe('DirectReplyFormatter', () => {
  const formatter = new DirectReplyFormatter();

  test('formats task replies', () => {
    const reply = formatter.format('system_query.tasks', [
      {
        taskId: 'task-1',
        goalDescription: '整理发布清单',
        status: 'running'
      }
    ]);

    expect(reply).toContain('共 1 个任务');
    expect(reply).toContain('整理发布清单');
    expect(reply).toContain('task-1');
  });

  test('formats context replies', () => {
    const reply = formatter.format('system_query.context', {
      used: 128,
      budget: 4000,
      ratio: 0.032,
      factCount: 6
    });

    expect(reply).toContain('Token used: 128');
    expect(reply).toContain('Fact count: 6');
  });

  test('formats pending contradiction replies', () => {
    const reply = formatter.format('system_query.contradictions', [
      {
        contradictionId: 'contradiction-1',
        subject: 'project',
        predicateFamily: 'deadline',
        existingValue: '3 月 15 日',
        newValue: '4 月 1 日'
      }
    ]);

    expect(reply).toContain('记忆矛盾待确认');
    expect(reply).toContain('contradiction-1');
    expect(reply).toContain('4 月 1 日');
  });

  test('returns graceful fallback for null data', () => {
    expect(formatter.format('system_query.memory_recent', null)).toBe('（暂无数据）');
  });
});
