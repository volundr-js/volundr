import { createRequire } from "node:module";
import { spawn, type ChildProcess } from "node:child_process";
import { Logger } from "@volundr/logger";

const log = Logger.getLogger("voice", "FFmpeg");

let cachedPath: string | null = null;

/**
 * Resolves the FFmpeg binary path.
 *
 * 1. Tries `ffmpeg-static` (npm package with bundled binary)
 * 2. Falls back to "ffmpeg" on system PATH
 *
 * Result is cached after the first call.
 */
export function getFFmpegPath(): string {
    if (cachedPath !== null) return cachedPath;

    try {
        const req = createRequire(import.meta.url);
        const staticPath = req("ffmpeg-static") as string;
        if (staticPath) {
            log.info(`Using ffmpeg-static: ${staticPath}`);
            cachedPath = staticPath;
            return cachedPath;
        }
    } catch {
        // ffmpeg-static not installed
    }

    log.info("Using system FFmpeg from PATH");
    cachedPath = "ffmpeg";
    return cachedPath;
}

export interface FFmpegSpawnOptions {
    /** Input: file path, URL, or undefined for stdin (pipe:0). */
    input: string | undefined;
    /** Volume multiplier (1.0 = unchanged). Applied via -af volume=X. */
    volume?: number;
}

/**
 * Spawns an FFmpeg child process that outputs Ogg/Opus to stdout.
 *
 * Output: 48kHz stereo Opus in Ogg container at 96kbps.
 */
export function spawnFFmpeg(options: FFmpegSpawnOptions): ChildProcess {
    const ffmpegPath = getFFmpegPath();
    const inputArg = options.input ?? "pipe:0";

    const args: string[] = [
        "-analyzeduration", "0",
        "-loglevel", "warning",
        "-i", inputArg,
    ];

    if (options.volume !== undefined && options.volume !== 1.0) {
        args.push("-af", `volume=${options.volume}`);
    }

    args.push(
        "-map", "0:a:0",
        "-acodec", "libopus",
        "-f", "ogg",
        "-ar", "48000",
        "-ac", "2",
        "-b:a", "96k",
        "pipe:1",
    );

    log.debug(() => `Spawning: ${ffmpegPath} ${args.join(" ")}`);

    return spawn(ffmpegPath, args, {
        stdio: ["pipe", "pipe", "pipe"],
        windowsHide: true,
    });
}
