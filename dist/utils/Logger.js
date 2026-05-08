// ============================================
// 日志系统 - 统一的日志管理
// ============================================
const LEVEL_PRIORITY = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3
};
export class Logger {
    level;
    prefix;
    constructor(options) {
        this.level = options.level;
        this.prefix = options.prefix || '';
    }
    shouldLog(level) {
        return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[this.level];
    }
    formatMessage(level, message, ...args) {
        const timestamp = new Date().toISOString();
        const prefix = this.prefix ? `[${this.prefix}] ` : '';
        const levelStr = `[${level.toUpperCase()}]`;
        const formattedMessage = args.length > 0
            ? `${message} ${args.map(a => JSON.stringify(a)).join(' ')}`
            : message;
        return `${timestamp} ${levelStr} ${prefix}${formattedMessage}`;
    }
    debug(message, ...args) {
        if (this.shouldLog('debug')) {
            console.debug(this.formatMessage('debug', message, ...args));
        }
    }
    info(message, ...args) {
        if (this.shouldLog('info')) {
            console.info(this.formatMessage('info', message, ...args));
        }
    }
    warn(message, ...args) {
        if (this.shouldLog('warn')) {
            console.warn(this.formatMessage('warn', message, ...args));
        }
    }
    error(message, ...args) {
        if (this.shouldLog('error')) {
            console.error(this.formatMessage('error', message, ...args));
        }
    }
    setLevel(level) {
        this.level = level;
    }
    getLevel() {
        return this.level;
    }
}
// 全局日志器实例
let globalLogger = null;
export function getLogger(prefix, level) {
    if (!globalLogger) {
        globalLogger = new Logger({
            level: level || 'info',
            prefix: 'AgentBrain'
        });
    }
    if (prefix) {
        return new Logger({ level: globalLogger.getLevel(), prefix });
    }
    return globalLogger;
}
export function setGlobalLogLevel(level) {
    if (!globalLogger) {
        getLogger();
    }
    globalLogger?.setLevel(level);
}
// 便捷函数
export const logger = getLogger();
