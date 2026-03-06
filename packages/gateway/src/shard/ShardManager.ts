import { Worker } from "node:worker_threads";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Logger } from "@volundr/logger";
import { RestClient } from "@volundr/rest";
import { TypedEmitter, GatewayEvent } from "@volundr/types";
import type { Snowflake, GatewayEvents } from "@volundr/types";
import type { GatewayPresence, GatewayBotData, GatewayStatus } from "../types.js";

const log = Logger.getLogger("gateway", "ShardManager");

const workerScript = join(dirname(fileURLToPath(import.meta.url)), "shard-worker.ts");

export interface ShardManagerOptions {
    token: string;
    intents: number;
    shardCount?: number | "auto";
    largeThreshold?: number;
    presence?: GatewayPresence;
    rest?: RestClient;
    apiVersion?: number;
    baseUrl?: string;
    maxRetries?: number;
    /** Enable zlib-stream transport compression for all shards. */
    compress?: boolean;
}

export interface ShardManagerEvents extends GatewayEvents {
    shardReady: { shardId: number };
    shardDisconnect: { shardId: number; code: number };
    shardError: { shardId: number; error: Error };
    allReady: void;
    error: Error;
}

interface ShardInfo {
    worker: Worker;
    status: GatewayStatus;
}

export class ShardManager extends TypedEmitter<ShardManagerEvents> {
    private readonly shardInfos = new Map<number, ShardInfo>();
    private shardCount = 0;
    private readyShards = new Set<number>();
    private readonly rest: RestClient;

    private readonly token: string;
    private readonly intents: number;
    private readonly largeThreshold?: number;
    private readonly presence?: GatewayPresence;
    private readonly requestedShardCount: number | "auto";
    private readonly apiVersion?: number;
    private readonly baseUrl?: string;
    private readonly maxRetries?: number;
    private readonly compress?: boolean;

    constructor(options: ShardManagerOptions) {
        super();

        this.token = options.token;
        this.intents = options.intents;
        this.largeThreshold = options.largeThreshold;
        this.presence = options.presence;
        this.requestedShardCount = options.shardCount ?? "auto";
        this.apiVersion = options.apiVersion;
        this.baseUrl = options.baseUrl;
        this.maxRetries = options.maxRetries;
        this.compress = options.compress;

        this.rest = options.rest ?? new RestClient({ token: options.token });
    }

    async connect(): Promise<void> {
        let maxConcurrency = 1;

        if (this.requestedShardCount === "auto") {
            const data = await this.rest.get<GatewayBotData>("/gateway/bot");
            this.shardCount = data.shards;
            maxConcurrency = data.session_start_limit.max_concurrency;
            log.info(`Auto shard count: ${this.shardCount} (max_concurrency=${maxConcurrency})`);
        } else {
            this.shardCount = this.requestedShardCount;
        }

        log.info(`Spawning ${this.shardCount} shards`);

        const delay = 5000 / maxConcurrency;

        for (let i = 0; i < this.shardCount; i++) {
            if (i > 0) {
                await this.sleep(delay);
            }
            this.spawnShard(i);
        }
    }

    disconnect(): void {
        for (const [shardId, info] of this.shardInfos) {
            log.info(`Disconnecting shard ${shardId}`);
            info.worker.postMessage({ type: "disconnect" });
        }

        this.shardInfos.clear();
        this.readyShards.clear();
    }

    getShardCount(): number {
        return this.shardCount;
    }

    getShard(guildId: Snowflake): number {
        return Number(BigInt(guildId) >> 22n) % this.shardCount;
    }

    getStatus(): Map<number, GatewayStatus> {
        const statuses = new Map<number, GatewayStatus>();
        for (const [id, info] of this.shardInfos) {
            statuses.set(id, info.status);
        }
        return statuses;
    }

    sendToShard(shardId: number, msg: unknown): void {
        const info = this.shardInfos.get(shardId);
        if (info) {
            info.worker.postMessage(msg);
        }
    }

    sendVoiceStateUpdate(guildId: Snowflake, channelId: Snowflake | null, selfMute: boolean, selfDeaf: boolean): void {
        const shardId = this.getShard(guildId);
        this.sendToShard(shardId, {
            type: "sendVoiceStateUpdate",
            guildId,
            channelId,
            selfMute,
            selfDeaf,
        });
    }

    requestGuildMembers(guildId: Snowflake, data: Record<string, unknown>): void {
        const shardId = this.getShard(guildId);
        this.sendToShard(shardId, { type: "requestGuildMembers", data });
    }

    setPresence(presence: GatewayPresence): void {
        for (const [, info] of this.shardInfos) {
            info.worker.postMessage({ type: "setPresence", presence });
        }
    }

    /**
     * Evaluate a script on all shards and collect the results.
     * The script receives the Client as `this` context.
     */
    async broadcastEval<T>(script: string, options?: { shard?: number; timeout?: number }): Promise<T[]> {
        const timeout = options?.timeout ?? 30_000;
        const shards = options?.shard !== undefined
            ? [options.shard]
            : [...this.shardInfos.keys()];

        const nonce = `eval_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const results = new Map<number, T>();

        return new Promise<T[]>((resolve, reject) => {
            const timer = setTimeout(() => {
                cleanup();
                reject(new Error(`broadcastEval timed out after ${timeout}ms`));
            }, timeout);

            const handlers = new Map<number, (msg: { type: string; nonce?: string; result?: T; error?: string }) => void>();

            for (const shardId of shards) {
                const info = this.shardInfos.get(shardId);
                if (!info) continue;

                const handler = (msg: { type: string; nonce?: string; result?: T; error?: string }) => {
                    if (msg.type !== "evalResult" || msg.nonce !== nonce) return;

                    if (msg.error) {
                        cleanup();
                        reject(new Error(`Shard ${shardId} eval error: ${msg.error}`));
                        return;
                    }

                    results.set(shardId, msg.result as T);
                    if (results.size === shards.length) {
                        cleanup();
                        resolve(shards.map(id => results.get(id) as T));
                    }
                };

                handlers.set(shardId, handler);
                info.worker.on("message", handler);
                info.worker.postMessage({ type: "eval", script, nonce });
            }

            const cleanup = () => {
                clearTimeout(timer);
                for (const [shardId, handler] of handlers) {
                    this.shardInfos.get(shardId)?.worker.off("message", handler);
                }
            };
        });
    }

    /**
     * Fetch a client property from all shards.
     * Shorthand for broadcastEval with a property access.
     */
    async fetchClientValues<T>(prop: string, options?: { timeout?: number }): Promise<T[]> {
        return this.broadcastEval<T>(`this.${prop}`, options);
    }

    /**
     * Respawn all shards with optional delay between each.
     */
    async respawnAll(options?: { shardDelay?: number; respawnDelay?: number; timeout?: number }): Promise<void> {
        const shardDelay = options?.shardDelay ?? 5000;

        for (const [shardId, info] of this.shardInfos) {
            log.info(`Respawning shard ${shardId}`);
            info.worker.postMessage({ type: "disconnect" });
            await this.waitForExit(info.worker, options?.timeout ?? 30_000);
            this.readyShards.delete(shardId);

            if (shardDelay > 0) await this.sleep(shardDelay);

            this.spawnShard(shardId);
        }
    }

    private waitForExit(worker: Worker, timeout: number): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            const timer = setTimeout(() => {
                worker.terminate();
                resolve();
            }, timeout);

            worker.once("exit", () => {
                clearTimeout(timer);
                resolve();
            });
        });
    }

    private spawnShard(shardId: number): void {
        const worker = new Worker(workerScript, {
            execArgv: ["--import", "tsx"],
            workerData: {
                token: this.token,
                intents: this.intents,
                shard: [shardId, this.shardCount] as [number, number],
                largeThreshold: this.largeThreshold,
                presence: this.presence,
                apiVersion: this.apiVersion,
                baseUrl: this.baseUrl,
                maxRetries: this.maxRetries,
                compress: this.compress,
            },
        });

        const info: ShardInfo = { worker, status: "disconnected" };
        this.shardInfos.set(shardId, info);

        worker.on("message", (msg: { type: string; event?: string; data?: unknown; error?: string; status?: GatewayStatus; code?: number }) => {
            switch (msg.type) {
                case "event":
                    this.emit(msg.event! as keyof GatewayEvents, msg.data as any);

                    if (msg.event === GatewayEvent.Ready) {
                        this.readyShards.add(shardId);
                        log.info(`Shard ${shardId} ready (${this.readyShards.size}/${this.shardCount})`);
                        this.emit("shardReady", { shardId });

                        if (this.readyShards.size === this.shardCount) {
                            log.info("All shards ready");
                            this.emit("allReady", undefined as void);
                        }
                    }
                    break;

                case "error":
                    log.error(`Shard ${shardId} error: ${msg.error}`);
                    this.emit("shardError", { shardId, error: new Error(msg.error) });
                    break;

                case "status":
                    info.status = msg.status!;
                    break;

                case "close":
                    log.warn(`Shard ${shardId} closed (code=${msg.code})`);
                    this.emit("shardDisconnect", { shardId, code: msg.code! });
                    break;
            }
        });

        worker.on("error", (err: Error) => {
            log.error(`Shard ${shardId} worker error: ${err.message}`);
            this.emit("shardError", { shardId, error: err });
        });

        worker.on("exit", (code: number) => {
            if (code !== 0) {
                log.error(`Shard ${shardId} crashed (code=${code}), respawning`);
                this.readyShards.delete(shardId);
                this.spawnShard(shardId);
                this.shardInfos.get(shardId)?.worker.postMessage({ type: "connect" });
            }
        });

        log.info(`Shard ${shardId} spawned`);
        worker.postMessage({ type: "connect" });
    }

    private sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
