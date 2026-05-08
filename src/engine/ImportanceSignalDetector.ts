import type { MemoryImportanceLevel } from '../types/index.js';
import { IMPORTANCE_STABILITY_MAP } from '../core/ImportanceLevels.js';

export const PERMANENT_SIGNALS: readonly RegExp[] = [
  /永远(记住|不能忘|不要忘|不能违反)/,
  /永久(记住|保留)/,
  /绝对不能/,
  /核心约束/,
  /never forget/i,
  /remember permanently/i,
  /core constraint/i
];

export const IMPORTANT_SIGNALS: readonly RegExp[] = [
  /这(件事|条|个)?.*(很|非常|相当)?重要/,
  /请记住/,
  /不要忘记/,
  /别忘记/,
  /关键(需求|约束|配置|决定|事实)/,
  /this is important/i,
  /please remember/i,
  /must remember/i,
  /don't forget/i,
  /key requirement/i
];

const NON_MEMORY_CONTEXT_SIGNALS: readonly RegExp[] = [
  /^(日志|代码注释|工具输出|引用文本|报错|错误日志)/,
  /^(log|code comment|tool output|quoted text|error log)/i
];

export class ImportanceSignalDetector {
  constructor(
    private readonly permanentSignals: readonly RegExp[] = PERMANENT_SIGNALS,
    private readonly importantSignals: readonly RegExp[] = IMPORTANT_SIGNALS
  ) {
    if (this.permanentSignals.length === 0 || this.importantSignals.length === 0) {
      throw new Error('Importance signal rules must not be empty.');
    }
  }

  detect(content: string): MemoryImportanceLevel {
    const text = content.trim();
    if (!text) return 'normal';
    if (NON_MEMORY_CONTEXT_SIGNALS.some((pattern) => pattern.test(text))) return 'normal';
    if (this.permanentSignals.some((pattern) => pattern.test(text))) return 'permanent';
    if (this.importantSignals.some((pattern) => pattern.test(text))) return 'important';
    return 'normal';
  }

  static detect(content: string): MemoryImportanceLevel {
    return new ImportanceSignalDetector().detect(content);
  }
}
