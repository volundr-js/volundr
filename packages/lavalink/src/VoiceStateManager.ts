import type { Snowflake, APIVoiceState, GatewayVoiceServerUpdateData } from "@volundr/types";
import type { VoiceUpdateData } from "./types.js";

interface PendingVoiceState {
    sessionId: string | null;
    channelId: string | null;
    event: GatewayVoiceServerUpdateData | null;
    resolve: ((data: VoiceUpdateData) => void) | null;
}

/**
 * Collects VOICE_STATE_UPDATE session_id and VOICE_SERVER_UPDATE token/endpoint
 * pairs for a guild, then resolves a promise with the complete VoiceUpdateData.
 */
export class VoiceStateManager {
    private readonly pending = new Map<Snowflake, PendingVoiceState>();

    /**
     * Returns a promise that resolves when both voice events have been received.
     */
    waitForVoice(guildId: Snowflake): Promise<VoiceUpdateData> {
        return new Promise<VoiceUpdateData>((resolve) => {
            const existing = this.pending.get(guildId);
            if (existing) {
                existing.resolve = resolve;
                this.tryResolve(guildId, existing);
            } else {
                this.pending.set(guildId, {
                    sessionId: null,
                    channelId: null,
                    event: null,
                    resolve,
                });
            }
        });
    }

    handleVoiceStateUpdate(state: APIVoiceState): void {
        if (!state.guild_id) return;
        const entry = this.getOrCreate(state.guild_id);
        entry.sessionId = state.session_id;
        entry.channelId = state.channel_id ?? null;
        this.tryResolve(state.guild_id, entry);
    }

    handleVoiceServerUpdate(data: GatewayVoiceServerUpdateData): void {
        const entry = this.getOrCreate(data.guild_id);
        entry.event = data;
        this.tryResolve(data.guild_id, entry);
    }

    clear(guildId: Snowflake): void {
        this.pending.delete(guildId);
    }

    private getOrCreate(guildId: Snowflake): PendingVoiceState {
        let entry = this.pending.get(guildId);
        if (!entry) {
            entry = { sessionId: null, channelId: null, event: null, resolve: null };
            this.pending.set(guildId, entry);
        }
        return entry;
    }

    private tryResolve(guildId: Snowflake, entry: PendingVoiceState): void {
        if (entry.sessionId && entry.channelId && entry.event && entry.event.endpoint && entry.resolve) {
            const data: VoiceUpdateData = {
                token: entry.event.token,
                endpoint: entry.event.endpoint,
                sessionId: entry.sessionId,
                channelId: entry.channelId,
            };
            const resolve = entry.resolve;
            this.pending.delete(guildId);
            resolve(data);
        }
    }
}
