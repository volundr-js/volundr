import { LogLevel } from "./LogLevel.js";

const useColor = !process.env["NO_COLOR"];

const COLORS = {
    reset: "\x1b[0m",
    gray: "\x1b[90m",
    cyan: "\x1b[36m",
    blue: "\x1b[34m",
    yellow: "\x1b[33m",
    red: "\x1b[31m",
    bold: "\x1b[1m",
} as const;

const LEVEL_CONFIG: Record<LogLevel, { label: string; color: string }> = {
    [LogLevel.TRACE]: { label: "TRACE", color: COLORS.gray },
    [LogLevel.DEBUG]: { label: "DEBUG", color: COLORS.cyan },
    [LogLevel.INFO]:  { label: "INFO",  color: COLORS.blue },
    [LogLevel.WARN]:  { label: "WARN",  color: COLORS.yellow },
    [LogLevel.ERROR]: { label: "ERROR", color: COLORS.red },
    [LogLevel.OFF]:   { label: "OFF",   color: COLORS.reset },
};

function color(text: string, ansi: string): string {
    return useColor ? `${ansi}${text}${COLORS.reset}` : text;
}

function timestamp(): string {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, "0");
    const m = String(now.getMinutes()).padStart(2, "0");
    const s = String(now.getSeconds()).padStart(2, "0");
    return `${h}:${m}:${s}`;
}

export function format(level: LogLevel, name: string, message: string): string {
    const config = LEVEL_CONFIG[level];
    const time = color(timestamp(), COLORS.gray);
    const lvl = color(config.label.padEnd(5), config.color);

    const slashIdx = name.indexOf("/");
    const ns = name.substring(0, slashIdx);
    const component = name.substring(slashIdx + 1);
    const src = `${color(ns, COLORS.gray)} / ${color(component.padEnd(14), COLORS.bold)}`;

    return `[${time}] [${lvl}] ${src}| ${message}`;
}
