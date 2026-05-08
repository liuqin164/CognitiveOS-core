export const PERMANENT_SIGNALS = [
    /永远(记住|不能忘|不要忘|不能违反)/,
    /永久(记住|保留)/,
    /绝对不能/,
    /核心约束/,
    /never forget/i,
    /remember permanently/i,
    /core constraint/i
];
export const IMPORTANT_SIGNALS = [
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
const NON_MEMORY_CONTEXT_SIGNALS = [
    /^(日志|代码注释|工具输出|引用文本|报错|错误日志)/,
    /^(log|code comment|tool output|quoted text|error log)/i
];
export class ImportanceSignalDetector {
    permanentSignals;
    importantSignals;
    constructor(permanentSignals = PERMANENT_SIGNALS, importantSignals = IMPORTANT_SIGNALS) {
        this.permanentSignals = permanentSignals;
        this.importantSignals = importantSignals;
        if (this.permanentSignals.length === 0 || this.importantSignals.length === 0) {
            throw new Error('Importance signal rules must not be empty.');
        }
    }
    detect(content) {
        const text = content.trim();
        if (!text)
            return 'normal';
        if (NON_MEMORY_CONTEXT_SIGNALS.some((pattern) => pattern.test(text)))
            return 'normal';
        if (this.permanentSignals.some((pattern) => pattern.test(text)))
            return 'permanent';
        if (this.importantSignals.some((pattern) => pattern.test(text)))
            return 'important';
        return 'normal';
    }
    static detect(content) {
        return new ImportanceSignalDetector().detect(content);
    }
}
