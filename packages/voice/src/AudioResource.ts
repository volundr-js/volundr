import type { Readable } from "node:stream";
import type { ChildProcess } from "node:child_process";
import { Logger } from "@volundr/logger";

const log = Logger.getLogger("voice", "AudioResource");

/**
 * Wraps a raw Opus frame stream with metadata and lifecycle management.
 *
 * The `opusStream` property satisfies the duck-typing contract in AudioPlayer.play(),
 * allowing you to pass an AudioResource directly: `player.play(resource)`.
 */
export class AudioResource<T = unknown> {
    /** The raw Opus frame stream, ready for AudioPlayer. */
    readonly opusStream: Readable;

    /** User-defined metadata (e.g. song title, requester, URL). */
    readonly metadata: T;

    private ffmpegProcess: ChildProcess | null;
    private destroyed = false;

    constructor(
        opusStream: Readable,
        metadata: T,
        ffmpegProcess: ChildProcess | null = null,
    ) {
        this.opusStream = opusStream;
        this.metadata = metadata;
        this.ffmpegProcess = ffmpegProcess;
    }

    /**
     * Destroys the audio resource, killing the FFmpeg process (if any)
     * and destroying the stream. Safe to call multiple times.
     */
    destroy(): void {
        if (this.destroyed) return;
        this.destroyed = true;

        if (this.ffmpegProcess && !this.ffmpegProcess.killed) {
            this.ffmpegProcess.kill("SIGKILL");
            log.debug("FFmpeg process killed");
        }
        this.ffmpegProcess = null;

        if (!this.opusStream.destroyed) {
            this.opusStream.destroy();
        }
    }

    get isDestroyed(): boolean {
        return this.destroyed;
    }
}
