export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export interface LoggerOptions {
    level: LogLevel;
    prefix?: string;
}
export declare class Logger {
    private level;
    private prefix;
    constructor(options: LoggerOptions);
    private shouldLog;
    private formatMessage;
    debug(message: string, ...args: any[]): void;
    info(message: string, ...args: any[]): void;
    warn(message: string, ...args: any[]): void;
    error(message: string, ...args: any[]): void;
    setLevel(level: LogLevel): void;
    getLevel(): LogLevel;
}
export declare function getLogger(prefix?: string, level?: LogLevel): Logger;
export declare function setGlobalLogLevel(level: LogLevel): void;
export declare const logger: Logger;
//# sourceMappingURL=Logger.d.ts.map