import { LogLevel } from "./LogLevel.js";
import { format } from "./Formatter.js";

const loggers = new Map<string, Logger>();

/** A log message can be a string or a lazy thunk to defer interpolation until needed. */
export type LazyMessage = string | (() => string);

export class Logger {
    private static globalLevel: LogLevel = LogLevel.INFO;

    private constructor(private readonly name: string) {}

    static getLogger(namespace: string, name: string): Logger {
        const key = `${namespace}/${name}`;
        let logger = loggers.get(key);
        if (!logger) {
            logger = new Logger(key);
            loggers.set(key, logger);
        }
        return logger;
    }

    static setLevel(level: LogLevel): void {
        Logger.globalLevel = level;
    }

    static getLevel(): LogLevel {
        return Logger.globalLevel;
    }

    isTraceEnabled(): boolean { return LogLevel.TRACE >= Logger.globalLevel; }
    isDebugEnabled(): boolean { return LogLevel.DEBUG >= Logger.globalLevel; }

    trace(message: LazyMessage, ...args: unknown[]): void {
        if (LogLevel.TRACE < Logger.globalLevel) return;
        this.output(LogLevel.TRACE, message, args);
    }

    debug(message: LazyMessage, ...args: unknown[]): void {
        if (LogLevel.DEBUG < Logger.globalLevel) return;
        this.output(LogLevel.DEBUG, message, args);
    }

    info(message: LazyMessage, ...args: unknown[]): void {
        if (LogLevel.INFO < Logger.globalLevel) return;
        this.output(LogLevel.INFO, message, args);
    }

    warn(message: LazyMessage, ...args: unknown[]): void {
        if (LogLevel.WARN < Logger.globalLevel) return;
        this.output(LogLevel.WARN, message, args);
    }

    error(message: LazyMessage, ...args: unknown[]): void {
        if (LogLevel.ERROR < Logger.globalLevel) return;
        this.output(LogLevel.ERROR, message, args);
    }

    private output(level: LogLevel, message: LazyMessage, args: unknown[]): void {
        const msg = typeof message === "function" ? message() : message;
        const line = format(level, this.name, msg);

        if (level >= LogLevel.ERROR) {
            console.error(line, ...args);
        } else if (level >= LogLevel.WARN) {
            console.warn(line, ...args);
        } else {
            console.log(line, ...args);
        }
    }
}
