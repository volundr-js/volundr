import { Logger } from "@volundr/logger";
import { TypedEmitter } from "@volundr/types";
import type { Snowflake, APIVoiceState, GatewayVoiceServerUpdateData } from "@volundr/types";
import type { Client } from "@volundr/client";
import { LavalinkNode } from "./LavalinkNode.js";
import { LavalinkPlayer } from "./LavalinkPlayer.js";
import { VoiceStateManager } from "./VoiceStateManager.js";
import type {
    LavalinkManagerOptions, LavalinkNodeOptions, NodeSelectorStrategy,
    LavalinkStatsPayload, LavalinkEvent, LavalinkReadyPayload,
    LavalinkPlayerData,
} from "./types.js";

const log = Logger.getLogger("lavalink", "Manager");

export interface LavalinkManagerEvents {
    nodeReady: { node: LavalinkNode; payload: LavalinkReadyPayload };
    nodeClose: { node: LavalinkNode; code: number; reason: string };
    nodeError: { node: LavalinkNode; error: Error };
    nodeStats: { node: LavalinkNode; stats: LavalinkStatsPayload };
    playerCreate: LavalinkPlayer;
    playerDestroy: LavalinkPlayer;
    playerDisconnect: LavalinkPlayer;
    playerMoved: { player: LavalinkPlayer; oldNode: LavalinkNode; newNode: LavalinkNode };
    rawEvent: { node: LavalinkNode; event: LavalinkEvent };
}

export class LavalinkManager extends TypedEmitter<LavalinkManagerEvents> {
    readonly nodes = new Map<string, LavalinkNode>();
    readonly players = new Map<Snowflake, LavalinkPlayer>();

    private readonly client: Client;
    private readonly userId: Snowflake;
    private readonly clientName: string;
    private readonly nodeSelector: NodeSelectorStrategy;
    private readonly voiceState: VoiceStateManager;
    private readonly autoDestroyOnDisconnect: boolean;
    private roundRobinIndex = 0;

    constructor(client: Client, options: LavalinkManagerOptions) {
        super();

        this.client = client;
        this.userId = options.userId ?? client.getUserId() ?? "";
        this.clientName = options.clientName ?? "volundr/1.0.0";
        this.nodeSelector = options.nodeSelector ?? "least-players";
        this.voiceState = new VoiceStateManager();
        this.autoDestroyOnDisconnect = options.autoDestroyOnDisconnect ?? true;

        for (const nodeOpts of options.nodes) {
            this.addNode(nodeOpts);
        }

        this.setupVoiceListeners();
    }

    // --- Node Management ---

    addNode(options: LavalinkNodeOptions): LavalinkNode {
        const node = new LavalinkNode(options, this.userId, this.clientName);

        node.on("ready", (payload) => {
            log.info(`Node "${node.name}" ready (session=${payload.sessionId})`);
            this.emit("nodeReady", { node, payload });
        });

        node.on("playerUpdate", (payload) => {
            const player = this.players.get(payload.guildId);
            player?._handlePlayerUpdate(payload.state);
        });

        node.on("event", (event) => {
            const player = this.players.get(event.guildId);
            if (player) {
                player._handleEvent(event as never);
            }
            this.emit("rawEvent", { node, event });
        });

        node.on("stats", (stats) => {
            this.emit("nodeStats", { node, stats });
        });

        node.on("close", ({ code, reason }) => {
            this.emit("nodeClose", { node, code, reason });
            this.attemptFailover(node);
        });

        node.on("error", (error) => {
            this.emit("nodeError", { node, error });
        });

        this.nodes.set(node.name, node);
        return node;
    }

    removeNode(name: string): void {
        const node = this.nodes.get(name);
        if (!node) return;
        node.disconnect();
        this.nodes.delete(name);
    }

    connectAll(): void {
        for (const node of this.nodes.values()) {
            node.connect();
        }
    }

    async disconnectAll(): Promise<void> {
        for (const player of this.players.values()) {
            await player.destroy();
        }
        this.players.clear();

        for (const node of this.nodes.values()) {
            node.disconnect();
        }
    }

    // --- Player Management ---

    getPlayer(guildId: Snowflake): LavalinkPlayer | undefined {
        return this.players.get(guildId);
    }

    createPlayer(guildId: Snowflake, nodeName?: string): LavalinkPlayer {
        const existing = this.players.get(guildId);
        if (existing) return existing;

        const node = nodeName
            ? this.nodes.get(nodeName)
            : this.selectNode();

        if (!node) {
            throw new Error("No available Lavalink nodes");
        }

        const player = new LavalinkPlayer(
            guildId,
            node,
            (g, c) => this.client.sendVoiceUpdate(g, c, false, true),
            (g) => this.voiceState.waitForVoice(g),
        );

        this.players.set(guildId, player);
        this.emit("playerCreate", player);

        log.info(`Player created for guild ${guildId} on node "${node.name}"`);
        return player;
    }

    /**
     * Recover players from a resumed Lavalink session.
     * Fetches active players via REST and recreates local LavalinkPlayer objects.
     * Returns the recovered player data so callers can restore application-level state (e.g. queues).
     */
    async recoverPlayers(node: LavalinkNode): Promise<LavalinkPlayerData[]> {
        if (!node.sessionId) return [];

        const playersData = await node.rest.getPlayers(node.sessionId);

        for (const data of playersData) {
            if (this.players.has(data.guildId)) continue;

            const player = new LavalinkPlayer(
                data.guildId,
                node,
                (g, c) => this.client.sendVoiceUpdate(g, c, false, true),
                (g) => this.voiceState.waitForVoice(g),
            );

            player._restoreState(data);
            this.players.set(data.guildId, player);

            log.info(`Recovered player for guild ${data.guildId} (track=${data.track?.info.title ?? "none"})`);
        }

        return playersData;
    }

    async destroyPlayer(guildId: Snowflake): Promise<void> {
        const player = this.players.get(guildId);
        if (!player) return;

        await player.destroy();
        this.players.delete(guildId);
        this.voiceState.clear(guildId);
        this.emit("playerDestroy", player);

        log.info(`Player destroyed for guild ${guildId}`);
    }

    // --- Node Selection ---

    private selectNode(): LavalinkNode | undefined {
        const available = [...this.nodes.values()].filter(
            (n) => n.getStatus() === "connected",
        );

        if (available.length === 0) return undefined;

        switch (this.nodeSelector) {
            case "round-robin": {
                this.roundRobinIndex = (this.roundRobinIndex + 1) % available.length;
                return available[this.roundRobinIndex];
            }
            case "least-players": {
                return available.reduce((best, node) => {
                    const bestPlayers = best.getStats()?.playingPlayers ?? 0;
                    const nodePlayers = node.getStats()?.playingPlayers ?? 0;
                    return nodePlayers < bestPlayers ? node : best;
                });
            }
            case "least-load": {
                return available.reduce((best, node) =>
                    node.getPenalty() < best.getPenalty() ? node : best,
                );
            }
            default:
                return available[0];
        }
    }

    // --- Failover ---

    private attemptFailover(deadNode: LavalinkNode): void {
        const affected = [...this.players.values()].filter((p) => p.node === deadNode);
        if (affected.length === 0) return;

        const newNode = this.selectNode();
        if (!newNode) {
            log.warn(`Node "${deadNode.name}" went down with ${affected.length} player(s), no other nodes available`);
            return;
        }

        log.info(`Migrating ${affected.length} player(s) from "${deadNode.name}" to "${newNode.name}"`);

        for (const player of affected) {
            const oldNode = player.node;
            player.node = newNode;

            if (player.channelId && player.voiceData) {
                player.setVoiceData(player.voiceData).then(() => {
                    if (player.track) {
                        player.play(player.track, {
                            startTime: player.getPosition(),
                            paused: player.paused,
                            volume: player.volume,
                        }).catch((err) => {
                            log.error(`Failed to resume track on "${newNode.name}" for guild ${player.guildId}: ${err}`);
                        });
                    }
                }).catch((err) => {
                    log.error(`Failed to migrate player for guild ${player.guildId}: ${err}`);
                });
            }

            this.emit("playerMoved", { player, oldNode, newNode });
        }
    }

    // --- Voice Event Routing ---

    private setupVoiceListeners(): void {
        this.client.on("VOICE_STATE_UPDATE", (state: APIVoiceState) => {
            if (state.user_id !== this.userId || !state.guild_id) return;
            const player = this.players.get(state.guild_id);
            if (!player) return;

            if (state.channel_id === null) {
                if (this.autoDestroyOnDisconnect) {
                    this.destroyPlayer(state.guild_id);
                } else {
                    player.channelId = null;
                    this.emit("playerDisconnect", player);
                }
                return;
            }

            this.voiceState.handleVoiceStateUpdate(state);
        });

        this.client.on("VOICE_SERVER_UPDATE", (data: GatewayVoiceServerUpdateData) => {
            const player = this.players.get(data.guild_id);
            if (!player) return;
            this.voiceState.handleVoiceServerUpdate(data);
        });
    }
}
