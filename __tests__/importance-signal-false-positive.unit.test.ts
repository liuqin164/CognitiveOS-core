import { describe, expect, test } from 'bun:test';
import { ImportanceSignalDetector } from '../src/engine/ImportanceSignalDetector.js';

describe('ImportanceSignalDetector false positives', () => {
  const ordinarySamples = [
    '我今天必须去买菜',
    '这个代码必须重新跑一下',
    '你必须先看这个报错',
    '明天一定要提醒我',
    '这个临时任务很关键',
    '日志里写了 critical error',
    '代码注释包含 must retry',
    '工具输出包含 important warning',
    '引用文本里有人说 this is important'
  ];

  test('does not promote ordinary temporary content', () => {
    for (const sample of ordinarySamples) {
      expect(ImportanceSignalDetector.detect(sample)).toBe('normal');
    }
  });

  test('keeps explicit long-term memory signals working', () => {
    expect(ImportanceSignalDetector.detect('请记住这个项目配置')).toBe('important');
    expect(ImportanceSignalDetector.detect('这是关键需求，发布前必须确认')).toBe('important');
    expect(ImportanceSignalDetector.detect('永远记住这个核心约束')).toBe('permanent');
    expect(ImportanceSignalDetector.detect('never forget this deployment rule')).toBe('permanent');
  });
});
