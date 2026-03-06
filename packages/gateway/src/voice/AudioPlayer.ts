import { Readable } from "node:stream";
import { Logger } from "@volundr/logger";
import { TypedEmitter } from "@volundr/types";
import { VoiceUDP } from "./VoiceUDP.js";
import { VoiceWebSocket } from "./VoiceWebSocket.js";
import { encryptOpusFrame } from "./Encryption.js";
import type { DAVEManager } from "./DAVEManager.js";

const log = Logger.getLogger("gateway", "AudioPlayer");

const FRAME_DURATION_NS = 20_000_000n; // 20ms in nanoseconds
const TIMESTAMP_INCREMENT = 960;       // 48000 Hz * 20ms
const SILENCE_FRAME = Buffer.from([0xf8, 0xff, 0xfe]);

export type AudioPlayerStatus = "idle" | "playing" | "paused";

export interface AudioPlayerEvents {
    status: AudioPlayerStatus;
    error: Error;
    idle: void;
}

export class AudioPlayer extends TypedEmitter<AudioPlayerEvents> {
    private status: AudioPlayerStatus = "idle";
    private stream: Readable | null = null;
    private resource: { destroy?: () => void } | null = null;
    private playbackTimer: ReturnType<typeof setTimeout> | null = null;
    private nextFrameTime = 0n;
    private frameCount = 0;

    // RTP state
    private sequence = 0;
    private timestamp = 0;
    private nonce = 0;

    constructor(
        private readonly udp: VoiceUDP,
        private readonly voiceWs: VoiceWebSocket,
        private readonly ssrc: number,
        private readonly secretKey: Uint8Array,
        private readonly dave: DAVEManager | null = null,
    ) {
        super();
    }

    play(input: Readable | { opusStream: Readable }): void {
        this.stop();

        if ("opusStream" in input && input.opusStream instanceof Readable) {
            this.stream = input.opusStream;
            this.resource = input as { destroy?: () => void };
        } else {
            this.stream = input as Readable;
            this.resource = null;
        }

        this.frameCount = 0;
        this.nextFrameTime = process.hrtime.bigint();
        this.setStatus("playing");

        this.voiceWs.sendSpeaking(1, this.ssrc);
        log.info("Playback started");

        this.stream.on("end", () => this.onStreamEnd());
        this.stream.on("error", (err) => {
            log.error(`Stream error: ${err.message}`);
            this.emit("error", err);
            this.stop();
        });

        this.scheduleNextFrame();
    }

    stop(): void {
        if (this.status === "idle") return;

        this.clearTimer();

        if (this.stream) {
            this.stream.removeAllListeners();
            this.stream.destroy();
            this.stream = null;
        }

        if (this.resource?.destroy) {
            this.resource.destroy();
        }
        this.resource = null;

        // Send silence frames to avoid audio artifacts
        this.sendSilenceFrames(5);

        this.voiceWs.sendSpeaking(0, this.ssrc);
        log.info(`Playback stopped (${this.frameCount} frames sent)`);

        this.setStatus("idle");
        this.emit("idle", undefined as void);
    }

    pause(): void {
        if (this.status !== "playing") return;
        this.clearTimer();
        this.voiceWs.sendSpeaking(0, this.ssrc);
        this.setStatus("paused");
        log.info("Playback paused");
    }

    resume(): void {
        if (this.status !== "paused") return;
        this.nextFrameTime = process.hrtime.bigint();
        this.voiceWs.sendSpeaking(1, this.ssrc);
        this.setStatus("playing");
        this.scheduleNextFrame();
        log.info("Playback resumed");
    }

    getStatus(): AudioPlayerStatus {
        return this.status;
    }

    getFrameCount(): number {
        return this.frameCount;
    }

    private scheduleNextFrame(): void {
        if (this.status !== "playing") return;

        this.nextFrameTime += FRAME_DURATION_NS;
        const now = process.hrtime.bigint();

        // If we've fallen more than 200ms behind, reset timing instead of
        // bursting frames at max speed (which causes audible fast-forward)
        if (now - this.nextFrameTime > 200_000_000n) {
            log.debug(`Timer drift exceeded 200ms, resetting timing reference`);
            this.nextFrameTime = now;
        }

        const delay = Number(this.nextFrameTime - now) / 1_000_000; // ns → ms
        this.playbackTimer = setTimeout(() => this.dispatchFrame(), Math.max(0, delay));
    }

    private dispatchFrame(): void {
        if (this.status !== "playing" || !this.stream) return;

        const frame = this.stream.read() as Buffer | null;

        if (frame === null) {
            // No data available yet - stream may be buffering
            if (!this.stream.readableEnded) {
                log.debug(`No frame available yet, waiting for readable (readableLength=${this.stream.readableLength}, flowing=${this.stream.readableFlowing})`);
                this.stream.once("readable", () => {
                    if (this.status === "playing") {
                        log.debug("Stream became readable, resuming dispatch");
                        this.nextFrameTime = process.hrtime.bigint();
                        this.dispatchFrame();
                    }
                });
            } else {
                log.debug("Stream read returned null and stream has ended");
            }
            return;
        }

        if (this.frameCount === 0) {
            log.info(`First audio frame received (${frame.length} bytes)`);
        }

        this.sendAudioPacket(frame);
        this.frameCount++;
        this.scheduleNextFrame();
    }

    private sendAudioPacket(opusFrame: Buffer): void {
        // DAVE layer: encrypt Opus frame before transport encryption
        const frame = this.dave ? this.dave.encryptOpus(opusFrame) : opusFrame;

        // Build 12-byte RTP header
        const header = Buffer.alloc(12);
        header[0] = 0x80;                           // Version 2, no padding/extension/CSRC
        header[1] = 0x78;                           // Payload type 120 (Opus)
        header.writeUInt16BE(this.sequence, 2);      // Sequence number
        header.writeUInt32BE(this.timestamp, 4);     // Timestamp
        header.writeUInt32BE(this.ssrc, 8);          // SSRC

        // Transport encryption (AEAD: RTP header is used as AAD)
        const { encrypted, nonceBytes } = encryptOpusFrame(frame, this.secretKey, this.nonce, header);

        // Packet: [RTP header (12)] [encrypted audio + auth tag] [nonce (4)]
        const packet = Buffer.concat([header, encrypted, nonceBytes]);
        this.udp.send(packet);

        // Advance RTP state
        this.sequence = (this.sequence + 1) & 0xffff;
        this.timestamp = (this.timestamp + TIMESTAMP_INCREMENT) >>> 0;
        this.nonce = (this.nonce + 1) >>> 0;
    }

    private sendSilenceFrames(count: number): void {
        for (let i = 0; i < count; i++) {
            this.sendAudioPacket(SILENCE_FRAME);
        }
    }

    private onStreamEnd(): void {
        log.info(`Stream ended (${this.frameCount} frames sent)`);
        this.clearTimer();
        this.sendSilenceFrames(5);
        this.voiceWs.sendSpeaking(0, this.ssrc);

        this.stream?.removeAllListeners();
        this.stream = null;

        if (this.resource?.destroy) {
            this.resource.destroy();
        }
        this.resource = null;

        this.setStatus("idle");
        this.emit("idle", undefined as void);
    }

    private clearTimer(): void {
        if (this.playbackTimer) {
            clearTimeout(this.playbackTimer);
            this.playbackTimer = null;
        }
    }

    private setStatus(status: AudioPlayerStatus): void {
        this.status = status;
        this.emit("status", status);
    }
}
