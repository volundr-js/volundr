import { TypedEmitter } from "@volundr/types";
import type { Snowflake } from "@volundr/types";
import type { LavalinkNode } from "./LavalinkNode.js";
import type {
    LavalinkTrack, LavalinkPlayerData, PlayerState, UpdatePlayerOptions, LavalinkFilters,
    TrackStartEvent, TrackEndEvent, TrackExceptionEvent, TrackStuckEvent,
    WebSocketClosedEvent, VoiceUpdateData, LoadResult,
} from "./types.js";

export interface LavalinkPlayerEvents {
    trackStart: TrackStartEvent;
    trackEnd: TrackEndEvent;
    trackException: TrackExceptionEvent;
    trackStuck: TrackStuckEvent;
    webSocketClosed: WebSocketClosedEvent;
    playerUpdate: PlayerState;
    destroyed: void;
}

export type PlayerStatus = "idle" | "playing" | "paused" | "destroyed";

export class LavalinkPlayer extends TypedEmitter<LavalinkPlayerEvents> {
    readonly guildId: Snowflake;

    track: LavalinkTrack | null = null;
    volume = 100;
    paused = false;
    state: PlayerState = { time: 0, position: 0, connected: false, ping: -1 };
    filters: LavalinkFilters = {};
    voiceData: VoiceUpdateData | null = null;
    channelId: Snowflake | null = null;

    private status: PlayerStatus = "idle";

    constructor(
        guildId: Snowflake,
        public node: LavalinkNode,
        private readonly sendVoiceUpdate: (guildId: Snowflake, channelId: Snowflake | null) => void,
        private readonly waitForVoice: (guildId: Snowflake) => Promise<VoiceUpdateData>,
    ) {
        super();
        this.guildId = guildId;
    }

    getStatus(): PlayerStatus {
        return this.status;
    }

    /** Get estimated position accounting for time since last update */
    getPosition(): number {
        if (!this.state.connected || this.paused) return this.state.position;
        return this.state.position + (Date.now() - this.state.time);
    }

    // --- Connection ---

    async connect(channelId: Snowflake, options?: { selfMute?: boolean; selfDeaf?: boolean }): Promise<void> {
        this.channelId = channelId;
        this.sendVoiceUpdate(this.guildId, channelId);
        const voiceData = await this.waitForVoice(this.guildId);
        await this.setVoiceData(voiceData);
    }

    async disconnect(): Promise<void> {
        this.sendVoiceUpdate(this.guildId, null);
        this.channelId = null;
    }

    async setVoiceData(data: VoiceUpdateData): Promise<void> {
        this.voiceData = data;
        await this.update({ voice: data });
    }

    // --- Playback ---

    async play(track: string | LavalinkTrack, options?: {
        startTime?: number;
        endTime?: number;
        volume?: number;
        paused?: boolean;
        noReplace?: boolean;
    }): Promise<void> {
        const encoded = typeof track === "string" ? track : track.encoded;
        const body: UpdatePlayerOptions = {
            track: { encoded },
        };
        if (options?.startTime !== undefined) body.position = options.startTime;
        if (options?.endTime !== undefined) body.endTime = options.endTime;
        if (options?.volume !== undefined) body.volume = options.volume;
        if (options?.paused !== undefined) body.paused = options.paused;

        await this.update(body, options?.noReplace);
        this.status = options?.paused ? "paused" : "playing";
    }

    async stop(): Promise<void> {
        await this.update({ track: { encoded: null } });
        this.track = null;
        this.status = "idle";
    }

    async setPaused(paused: boolean): Promise<void> {
        await this.update({ paused });
        this.paused = paused;
        this.status = paused ? "paused" : "playing";
    }

    async seek(position: number): Promise<void> {
        await this.update({ position });
    }

    async setVolume(volume: number): Promise<void> {
        await this.update({ volume });
        this.volume = volume;
    }

    async setFilters(filters: LavalinkFilters): Promise<void> {
        await this.update({ filters });
        this.filters = filters;
    }

    async clearFilters(): Promise<void> {
        await this.setFilters({});
    }

    // --- Convenience ---

    async search(identifier: string): Promise<LoadResult> {
        return this.node.rest.loadTracks(identifier);
    }

    // --- Internal ---

    private async update(data: UpdatePlayerOptions, noReplace = false): Promise<void> {
        if (!this.node.sessionId) {
            throw new Error("Node not connected (no sessionId)");
        }
        const result = await this.node.rest.updatePlayer(
            this.node.sessionId,
            this.guildId,
            data,
            noReplace,
        );
        if (result) {
            if (result.track) this.track = result.track;
            this.volume = result.volume;
            this.paused = result.paused;
            this.state = result.state;
            this.filters = result.filters;
        }
    }

    /** @internal Called by LavalinkManager to dispatch events */
    _handleEvent(event: TrackStartEvent | TrackEndEvent | TrackExceptionEvent | TrackStuckEvent | WebSocketClosedEvent): void {
        switch (event.type) {
            case "TrackStartEvent":
                this.track = event.track;
                this.status = "playing";
                this.emit("trackStart", event);
                break;
            case "TrackEndEvent":
                this.track = null;
                this.status = "idle";
                this.emit("trackEnd", event);
                break;
            case "TrackExceptionEvent":
                this.emit("trackException", event);
                break;
            case "TrackStuckEvent":
                this.emit("trackStuck", event);
                break;
            case "WebSocketClosedEvent":
                this.emit("webSocketClosed", event);
                break;
        }
    }

    /** @internal Called by LavalinkManager to restore state from REST data on session resume. */
    _restoreState(data: LavalinkPlayerData): void {
        this.track = data.track;
        this.volume = data.volume;
        this.paused = data.paused;
        this.state = data.state;
        this.filters = data.filters;
        this.voiceData = data.voice;
        this.channelId = data.voice?.channelId ?? null;
        if (data.track) {
            this.status = data.paused ? "paused" : "playing";
        }
    }

    /** @internal Called by LavalinkManager to update player state */
    _handlePlayerUpdate(state: PlayerState): void {
        this.state = state;
        this.emit("playerUpdate", state);
    }

    async destroy(): Promise<void> {
        if (this.status === "destroyed") return;

        if (this.node.sessionId) {
            try {
                await this.node.rest.destroyPlayer(this.node.sessionId, this.guildId);
            } catch {
                // Ignore errors during cleanup
            }
        }

        this.sendVoiceUpdate(this.guildId, null);
        this.channelId = null;
        this.status = "destroyed";
        this.emit("destroyed", undefined as never);
    }
}
