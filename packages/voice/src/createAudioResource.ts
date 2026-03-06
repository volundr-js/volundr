import type { Readable } from "node:stream";
import { OggDemuxer } from "@volundr/gateway";
import { Logger } from "@volundr/logger";
import { AudioResource } from "./AudioResource.js";
import { StreamType } from "./StreamType.js";
import { spawnFFmpeg } from "./FFmpeg.js";

const log = Logger.getLogger("voice", "createAudioResource");

export interface CreateAudioResourceOptions<T = unknown> {
    /**
     * The type of the input stream.
     * Only relevant when input is a Readable. Ignored for string inputs.
     * @default StreamType.Arbitrary
     */
    inputType?: StreamType;

    /** User-defined metadata to attach to the AudioResource. */
    metadata?: T;

    /**
     * Volume level applied during FFmpeg transcoding.
     * 1.0 = original, 0.5 = half, 2.0 = double.
     * Only applies when FFmpeg is used (string input or Arbitrary stream).
     */
    volume?: number;
}

/**
 * Creates an AudioResource from a file path, URL, or Readable stream.
 *
 * Conversion paths:
 *   string (file/URL)          → FFmpeg → OggDemuxer → raw Opus
 *   Readable + Opus            → pass-through
 *   Readable + OggOpus         → OggDemuxer → raw Opus
 *   Readable + Arbitrary       → FFmpeg (stdin) → OggDemuxer → raw Opus
 */
export function createAudioResource<T = unknown>(
    input: string | Readable,
    options?: CreateAudioResourceOptions<T>,
): AudioResource<T> {
    const metadata = (options?.metadata ?? undefined) as T;
    const volume = options?.volume;

    if (typeof input === "string") {
        return createFromFFmpeg(input, undefined, metadata, volume);
    }

    const inputType = options?.inputType ?? StreamType.Arbitrary;

    switch (inputType) {
        case StreamType.Opus:
            return createFromOpus(input, metadata);
        case StreamType.OggOpus:
            return createFromOggOpus(input, metadata);
        case StreamType.Arbitrary:
            return createFromFFmpeg(undefined, input, metadata, volume);
        default:
            throw new Error(`Unknown StreamType: ${inputType as string}`);
    }
}

/** Raw Opus frames - wrap and return directly. */
function createFromOpus<T>(stream: Readable, metadata: T): AudioResource<T> {
    log.debug("Creating AudioResource from raw Opus stream (pass-through)");
    return new AudioResource(stream, metadata, null);
}

/** Ogg/Opus container - pipe through OggDemuxer. */
function createFromOggOpus<T>(stream: Readable, metadata: T): AudioResource<T> {
    log.debug("Creating AudioResource from Ogg/Opus stream (demuxing)");

    const demuxer = new OggDemuxer();
    stream.on("error", (err) => demuxer.destroy(err));
    stream.pipe(demuxer);

    return new AudioResource(demuxer, metadata, null);
}

/** Needs FFmpeg transcoding. */
function createFromFFmpeg<T>(
    fileOrUrl: string | undefined,
    stdinStream: Readable | undefined,
    metadata: T,
    volume?: number,
): AudioResource<T> {
    log.debug(() => `Creating AudioResource via FFmpeg (input=${fileOrUrl ?? "stdin"}, volume=${volume ?? 1.0})`);

    const proc = spawnFFmpeg({ input: fileOrUrl, volume });
    const demuxer = new OggDemuxer();

    // Collect stderr for error reporting
    let stderrData = "";
    proc.stderr?.on("data", (chunk: Buffer) => {
        stderrData += chunk.toString();
    });

    proc.on("error", (err) => {
        log.error(`FFmpeg spawn error: ${err.message}`);
        demuxer.destroy(err);
    });

    proc.on("close", (code) => {
        if (code !== 0 && code !== null) {
            const errMsg = stderrData.trim() || `FFmpeg exited with code ${code}`;
            log.error(`FFmpeg error (code ${code}): ${errMsg}`);
            if (!demuxer.destroyed) {
                demuxer.destroy(new Error(`FFmpeg error (code ${code}): ${errMsg}`));
            }
        }
    });

    // Pipe stdin stream if provided (Arbitrary input)
    if (stdinStream) {
        stdinStream.on("error", (err) => {
            log.error(`Input stream error: ${err.message}`);
            if (!proc.killed) proc.kill("SIGKILL");
            demuxer.destroy(err);
        });

        stdinStream.pipe(proc.stdin!);

        proc.stdin!.on("error", (err) => {
            // EPIPE is expected when FFmpeg exits before consuming all input
            if ((err as NodeJS.ErrnoException).code !== "EPIPE") {
                log.error(`FFmpeg stdin error: ${err.message}`);
            }
            if (!stdinStream.destroyed) stdinStream.destroy();
        });
    }

    // Pipe FFmpeg stdout (Ogg/Opus) through demuxer
    proc.stdout!.pipe(demuxer);

    proc.stdout!.on("error", (err) => {
        log.error(`FFmpeg stdout error: ${err.message}`);
        demuxer.destroy(err);
    });

    return new AudioResource(demuxer, metadata, proc);
}
