import { createInflate, constants as zlibConstants } from "node:zlib";
import type { Inflate } from "node:zlib";
import WebSocket from "ws";
import { Logger } from "@volundr/logger";
import { RestClient } from "@volundr/rest";
import { TypedEmitter } from "@volundr/types";
import { Heartbeat } from "./Heartbeat.js";
import { GATEWAY_VERSION } from "./constants.js";
import type {
    GatewayOptions,
    GatewayPresence,
    GatewayPayload,
    GatewayBotData,
    GatewayStatus,
    GatewayInternalEvents,
    HelloData,
    ReadyData,
} from "./types.js";
import { GatewayOpcodes } from "./types.js";

const log = Logger.getLogger("gateway", "Gateway");

/** Close codes that indicate a non-recoverable connection. */
const NON_RECOVERABLE_CODES = new Set([1000, 4004, 4010, 4011, 4012, 4013, 4014]);

export class Gateway extends TypedEmitter<GatewayInternalEvents> {
    private ws: WebSocket | null = null;
    private readonly rest: RestClient;
    private readonly heartbeat: Heartbeat;

    private sequence: number | null = null;
    private sessionId: string | null = null;
    private resumeUrl: string | null = null;
    private status: GatewayStatus = "disconnected";
    private reconnectAttempts = 0;

    private readonly token: string;
    private readonly intents: number;
    private readonly largeThreshold: number;
    private presence: GatewayOptions["presence"];
    private readonly shard: [number, number] | undefined;
    private readonly compress: boolean;

    /** Persistent zlib inflate stream used for zlib-stream decompression. */
    private inflate: Inflate | null = null;
    /** Buffer that accumulates compressed chunks until the zlib suffix is detected. */
    private inflateBuffer: Buffer[] = [];
    /** Persistent decompressed chunks buffer - reused across messages to avoid allocations. */
    private _inflateChunks: Buffer[] = [];

    constructor(options: GatewayOptions) {
        super();

        this.token = options.token;
        this.intents = options.intents;
        this.largeThreshold = options.largeThreshold ?? 50;
        this.presence = options.presence;
        this.shard = options.shard;
        this.compress = options.compress ?? false;

        this.rest = options.rest ?? new RestClient({ token: options.token });

        this.heartbeat = new Heartbeat(
            (op, d) => this.send(op, d),
            () => this.handleZombie(),
        );
    }

    async connect(): Promise<void> {
        if (this.status !== "disconnected") {
            log.warn("Already connected or connecting");
            return;
        }

        this.setStatus("connecting");

        const data = await this.rest.get<GatewayBotData>("/gateway/bot");
        const compressParam = this.compress ? "&compress=zlib-stream" : "";
        const url = `${data.url}/?v=${GATEWAY_VERSION}&encoding=json${compressParam}`;

        log.info(`Connecting to ${data.url} (${data.shards} recommended shards)${this.compress ? " [zlib-stream]" : ""}`);
        log.debug(
            `Session limits: ${data.session_start_limit.remaining}/${data.session_start_limit.total} ` +
            `(resets in ${Math.round(data.session_start_limit.reset_after / 1000)}s)`,
        );

        this.createWebSocket(url);
    }

    disconnect(code = 1000): void {
        this.heartbeat.stop();
        this.destroyInflate();

        if (this.ws) {
            this.ws.removeAllListeners();
            if (this.ws.readyState === WebSocket.OPEN) {
                this.ws.close(code);
            }
            this.ws = null;
        }

        this.setStatus("disconnected");
        log.info("Disconnected");
    }

    getStatus(): GatewayStatus {
        return this.status;
    }

    sendVoiceStateUpdate(guildId: string, channelId: string | null, selfMute: boolean, selfDeaf: boolean): void {
        this.send(GatewayOpcodes.VoiceStateUpdate, {
            guild_id: guildId,
            channel_id: channelId,
            self_mute: selfMute,
            self_deaf: selfDeaf,
        });
    }

    requestGuildMembers(data: Record<string, unknown>): void {
        this.send(GatewayOpcodes.RequestGuildMembers, data);
    }

    setPresence(presence: GatewayPresence): void {
        this.presence = presence;
        this.send(GatewayOpcodes.PresenceUpdate, {
            status: presence.status ?? "online",
            activities: presence.activities ?? [],
            afk: presence.afk ?? false,
            since: null,
        });
    }

    private createWebSocket(url: string): void {
        if (this.compress) {
            this.initInflate();
        }

        this.ws = new WebSocket(url);

        this.ws.on("open", () => {
            log.debug("WebSocket open");
            this.reconnectAttempts = 0;
        });

        this.ws.on("message", (raw: WebSocket.RawData) => {
            if (this.compress) {
                this.handleCompressedMessage(raw);
            } else {
                const payload: GatewayPayload = JSON.parse(raw.toString());
                this.onMessage(payload);
            }
        });

        this.ws.on("close", (code: number, reason: Buffer) => {
            log.warn(`WebSocket closed (code=${code}, reason=${reason.toString() || "none"})`);
            this.heartbeat.stop();

            // 4007 (Invalid seq) and 4009 (Session timed out): clear session so we do a fresh IDENTIFY
            if (code === 4007 || code === 4009) {
                this.sessionId = null;
                this.sequence = null;
                this.resumeUrl = null;
            }

            if (this.shouldReconnect(code)) {
                this.reconnect();
            } else {
                this.setStatus("disconnected");
                this.emit("close", code);
            }
        });

        this.ws.on("error", (err: Error) => {
            log.error(`WebSocket error: ${err.message}`);
        });
    }

    private onMessage(payload: GatewayPayload): void {
        switch (payload.op) {
            case GatewayOpcodes.Hello:
                this.onHello(payload.d as HelloData);
                break;

            case GatewayOpcodes.HeartbeatAck:
                this.heartbeat.ack();
                break;

            case GatewayOpcodes.Heartbeat:
                this.send(GatewayOpcodes.Heartbeat, this.sequence);
                break;

            case GatewayOpcodes.Dispatch:
                this.onDispatch(payload);
                break;

            case GatewayOpcodes.Reconnect:
                log.info("Server requested reconnect");
                this.reconnect();
                break;

            case GatewayOpcodes.InvalidSession:
                this.onInvalidSession(payload.d as boolean);
                break;
        }
    }

    private onHello(data: HelloData): void {
        log.info(`Hello received (heartbeat_interval=${data.heartbeat_interval}ms)`);

        this.heartbeat.start(data.heartbeat_interval, () => this.sequence);

        if (this.sessionId && this.status === "resuming") {
            this.resume();
        } else {
            this.identify();
        }
    }

    private onDispatch(payload: GatewayPayload): void {
        if (payload.s !== null) {
            this.sequence = payload.s;
        }

        const event = payload.t!;
        log.debug(() => `Dispatch: ${event}`);

        if (event === "READY") {
            const data = payload.d as ReadyData;
            this.sessionId = data.session_id;
            this.resumeUrl = data.resume_gateway_url;
            this.setStatus("connected");
            log.info(`Ready (session=${data.session_id}, user=${data.user.username})`);
        }

        if (event === "RESUMED") {
            this.setStatus("connected");
            log.info("Session resumed");
        }

        this.emit(event, payload.d);
    }

    private onInvalidSession(resumable: boolean): void {
        log.warn(`Invalid session (resumable=${resumable})`);

        if (resumable) {
            this.reconnect();
        } else {
            this.sessionId = null;
            this.sequence = null;
            this.resumeUrl = null;

            const delay = 1000 + Math.random() * 4000;
            log.info(`Re-identifying in ${Math.round(delay)}ms`);
            setTimeout(() => {
                this.disconnect(4000);
                this.connect();
            }, delay);
        }
    }

    private identify(): void {
        log.info(`Sending IDENTIFY${this.shard ? ` (shard ${this.shard[0]}/${this.shard[1]})` : ""}`);

        const payload: Record<string, unknown> = {
            token: this.token,
            intents: this.intents,
            large_threshold: this.largeThreshold,
            properties: {
                os: process.platform,
                browser: "volundr",
                device: "volundr",
            },
        };

        if (this.shard) {
            payload.shard = this.shard;
        }

        if (this.presence) {
            payload.presence = {
                status: this.presence.status ?? "online",
                activities: this.presence.activities ?? [],
                afk: this.presence.afk ?? false,
                since: null,
            };
        }

        this.send(GatewayOpcodes.Identify, payload);
    }

    private resume(): void {
        log.info(`Sending RESUME (session=${this.sessionId}, seq=${this.sequence})`);

        this.send(GatewayOpcodes.Resume, {
            token: this.token,
            session_id: this.sessionId,
            seq: this.sequence,
        });
    }

    private reconnect(): void {
        this.heartbeat.stop();
        this.destroyInflate();

        if (this.ws) {
            this.ws.removeAllListeners();
            this.ws.close(4000);
            this.ws = null;
        }

        this.reconnectAttempts++;
        const backoff = Math.min(1000 * 2 ** this.reconnectAttempts, 30_000);

        log.info(`Reconnecting in ${backoff}ms (attempt ${this.reconnectAttempts})`);
        this.setStatus("resuming");

        setTimeout(() => {
            const compressParam = this.compress ? "&compress=zlib-stream" : "";
            const url = this.resumeUrl
                ? `${this.resumeUrl}/?v=${GATEWAY_VERSION}&encoding=json${compressParam}`
                : null;

            if (url) {
                this.createWebSocket(url);
            } else {
                this.setStatus("disconnected");
                this.connect();
            }
        }, backoff);
    }

    private handleZombie(): void {
        log.warn("Zombie connection detected, reconnecting");
        this.reconnect();
    }

    private send(op: GatewayOpcodes, d: unknown): void {
        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ op, d }));
        }
    }

    private setStatus(status: GatewayStatus): void {
        this.status = status;
        this.emit("status", status);
    }

    // --- zlib-stream compression ---

    /** Create a fresh zlib inflate stream and clear the chunk buffer. */
    private initInflate(): void {
        this.destroyInflate();
        this.inflate = createInflate({ chunkSize: 65535, flush: zlibConstants.Z_SYNC_FLUSH });
        this.inflateBuffer.length = 0;
        this._inflateChunks.length = 0;

        // Register persistent listeners once - avoids per-message closure allocation
        this.inflate.on("data", (chunk: Buffer) => { this._inflateChunks.push(chunk); });
        this.inflate.on("error", (err: Error) => {
            log.error(`zlib inflate error: ${err.message}`);
        });

        log.debug("Initialized zlib-stream inflate");
    }

    /** Destroy the current inflate stream and clear the buffer. */
    private destroyInflate(): void {
        if (this.inflate) {
            this.inflate.removeAllListeners();
            this.inflate.close();
            this.inflate = null;
        }
        this.inflateBuffer.length = 0;
        this._inflateChunks.length = 0;
    }

    /**
     * Handle an incoming compressed WebSocket message.
     *
     * Discord zlib-stream sends data as binary chunks.  A complete
     * payload ends with the 4-byte suffix `\x00\x00\xff\xff`.
     * We accumulate chunks in {@link inflateBuffer} and, once the
     * suffix is detected, push the concatenated buffer through the
     * persistent inflate stream with Z_SYNC_FLUSH to obtain the
     * decompressed JSON.
     */
    private handleCompressedMessage(raw: WebSocket.RawData): void {
        const data = Buffer.isBuffer(raw) ? raw : Buffer.from(raw as ArrayBuffer);
        this.inflateBuffer.push(data);

        // Check for the zlib sync-flush suffix at the end of the chunk
        if (data.length < 4 || data[data.length - 4] !== 0x00 || data[data.length - 3] !== 0x00 || data[data.length - 2] !== 0xff || data[data.length - 1] !== 0xff) {
            return; // Incomplete message, wait for more chunks
        }

        const combined = this.inflateBuffer.length === 1
            ? this.inflateBuffer[0]
            : Buffer.concat(this.inflateBuffer);
        this.inflateBuffer.length = 0;

        if (!this.inflate) {
            log.error("Received compressed data but inflate stream is not initialized");
            return;
        }

        // Clear persistent chunks buffer and decompress
        this._inflateChunks.length = 0;
        this.inflate.write(combined);
        this.inflate.flush(zlibConstants.Z_SYNC_FLUSH, () => { /* sync in Node.js */ });

        if (this._inflateChunks.length === 0) {
            return;
        }

        const json = this._inflateChunks.length === 1
            ? this._inflateChunks[0].toString("utf-8")
            : Buffer.concat(this._inflateChunks).toString("utf-8");

        try {
            const payload: GatewayPayload = JSON.parse(json);
            this.onMessage(payload);
        } catch (err) {
            log.error(`Failed to parse decompressed payload: ${(err as Error).message}`);
        }
    }

    private shouldReconnect(code: number): boolean {
        return !NON_RECOVERABLE_CODES.has(code);
    }
}
