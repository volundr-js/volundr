import WebSocket from "ws";
import { Logger } from "@volundr/logger";
import { TypedEmitter } from "@volundr/types";
import type { Snowflake } from "@volundr/types";
import { LavalinkRest } from "./LavalinkRest.js";
import type {
    LavalinkNodeOptions, LavalinkNodeStatus,
    LavalinkReadyPayload, LavalinkPlayerUpdatePayload,
    LavalinkStatsPayload, LavalinkEvent,
    LavalinkMessage, LavalinkInfo,
} from "./types.js";

const log = Logger.getLogger("lavalink", "Node");

export interface LavalinkNodeEvents {
    ready: LavalinkReadyPayload;
    playerUpdate: LavalinkPlayerUpdatePayload;
    stats: LavalinkStatsPayload;
    event: LavalinkEvent;
    status: LavalinkNodeStatus;
    error: Error;
    close: { code: number; reason: string };
}

export class LavalinkNode extends TypedEmitter<LavalinkNodeEvents> {
    readonly name: string;
    readonly rest: LavalinkRest;

    private ws: WebSocket | null = null;
    private status: LavalinkNodeStatus = "disconnected";
    private reconnectAttempts = 0;
    private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    sessionId: string | null = null;
    private stats: LavalinkStatsPayload | null = null;
    private info: LavalinkInfo | null = null;

    private readonly host: string;
    private readonly port: number;
    private readonly password: string;
    private readonly secure: boolean;
    private readonly userId: Snowflake;
    private readonly clientName: string;
    private readonly resumeSessionId: string | null;
    private readonly resumeTimeout: number;

    constructor(options: LavalinkNodeOptions, userId: Snowflake, clientName: string) {
        super();

        this.name = options.name;
        this.host = options.host;
        this.port = options.port;
        this.password = options.password;
        this.secure = options.secure ?? false;
        this.userId = userId;
        this.clientName = clientName;
        this.resumeSessionId = options.sessionId ?? null;
        this.resumeTimeout = options.resumeTimeout ?? 60_000;

        this.rest = new LavalinkRest(
            this.host,
            this.port,
            this.password,
            this.secure,
            this.userId,
            this.clientName,
        );
    }

    connect(): void {
        if (this.status !== "disconnected") return;

        this.setStatus("connecting");
        const protocol = this.secure ? "wss" : "ws";
        const url = `${protocol}://${this.host}:${this.port}/v4/websocket`;

        const headers: Record<string, string> = {
            "Authorization": this.password,
            "User-Id": this.userId,
            "Client-Name": this.clientName,
        };

        if (this.resumeSessionId || this.sessionId) {
            headers["Session-Id"] = (this.resumeSessionId ?? this.sessionId)!;
        }

        log.info(`[${this.name}] Connecting to ${url}`);

        this.ws = new WebSocket(url, { headers });

        this.ws.on("open", () => {
            log.info(`[${this.name}] WebSocket open`);
            this.reconnectAttempts = 0;
        });

        this.ws.on("message", (raw: WebSocket.RawData) => {
            try {
                const payload = JSON.parse(raw.toString()) as LavalinkMessage;
                this.onMessage(payload);
            } catch (err) {
                log.error(`[${this.name}] Failed to parse message: ${err}`);
            }
        });

        this.ws.on("close", (code: number, reason: Buffer) => {
            const reasonStr = reason.toString() || "none";
            log.warn(`[${this.name}] WebSocket closed (code=${code}, reason=${reasonStr})`);
            this.emit("close", { code, reason: reasonStr });
            this.scheduleReconnect();
        });

        this.ws.on("error", (err: Error) => {
            log.error(`[${this.name}] WebSocket error: ${err.message}`);
            this.emit("error", err);
        });
    }

    disconnect(): void {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }

        if (this.ws) {
            this.ws.removeAllListeners();
            if (this.ws.readyState === WebSocket.OPEN) {
                this.ws.close(1000);
            }
            this.ws = null;
        }

        this.setStatus("disconnected");
        log.info(`[${this.name}] Disconnected`);
    }

    getStatus(): LavalinkNodeStatus {
        return this.status;
    }

    getStats(): LavalinkStatsPayload | null {
        return this.stats;
    }

    getInfo(): LavalinkInfo | null {
        return this.info;
    }

    /** Penalty score for load balancing (lower = better) */
    getPenalty(): number {
        if (!this.stats) return 0;
        const cpu = this.stats.cpu;
        const frames = this.stats.frameStats;

        let penalty = 0;
        penalty += this.stats.playingPlayers;
        penalty += Math.pow(1.05, 100 * cpu.systemLoad) * 10 - 10;
        penalty += Math.pow(1.03, 100 * cpu.lavalinkLoad) * 10 - 10;

        if (frames) {
            penalty += frames.deficit * 0.01;
            penalty += frames.nulled * 0.005;
        }

        return penalty;
    }

    private onMessage(payload: LavalinkMessage): void {
        switch (payload.op) {
            case "ready":
                this.onReady(payload as LavalinkReadyPayload);
                break;
            case "playerUpdate":
                this.emit("playerUpdate", payload as LavalinkPlayerUpdatePayload);
                break;
            case "stats":
                this.stats = payload as LavalinkStatsPayload;
                this.emit("stats", this.stats);
                break;
            case "event":
                this.emit("event", payload as LavalinkEvent);
                break;
        }
    }

    private async onReady(payload: LavalinkReadyPayload): Promise<void> {
        this.sessionId = payload.sessionId;
        this.setStatus("connected");

        log.info(`[${this.name}] Ready (session=${payload.sessionId}, resumed=${payload.resumed})`);

        try {
            await this.rest.updateSession(this.sessionId, {
                resuming: true,
                timeout: this.resumeTimeout / 1000,
            });
            log.info(`[${this.name}] Session resuming enabled (timeout=${this.resumeTimeout}ms)`);
        } catch (err) {
            log.warn(`[${this.name}] Failed to enable session resuming: ${err}`);
        }

        try {
            this.info = await this.rest.getInfo();
            log.info(`[${this.name}] Lavalink ${this.info.version.semver} (${this.info.sourceManagers.join(", ")})`);
        } catch (err) {
            log.warn(`[${this.name}] Failed to fetch server info: ${err}`);
        }

        this.emit("ready", payload);
    }

    private scheduleReconnect(): void {
        this.reconnectAttempts++;
        const backoff = Math.min(1000 * 2 ** this.reconnectAttempts, 30_000);

        log.info(`[${this.name}] Reconnecting in ${backoff}ms (attempt ${this.reconnectAttempts})`);
        this.setStatus("reconnecting");

        this.reconnectTimer = setTimeout(() => {
            this.ws = null;
            this.setStatus("disconnected");
            this.connect();
        }, backoff);
    }

    private setStatus(status: LavalinkNodeStatus): void {
        this.status = status;
        this.emit("status", status);
    }
}
