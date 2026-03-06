import type { APIVoiceState, Snowflake } from "@volundr/types";
import type { Client } from "../Client.js";
import type { Guild } from "./Guild.js";
import type { GuildMember } from "./GuildMember.js";
import type { VoiceChannel } from "./channels/VoiceChannel.js";

/**
 * Represents a user's voice connection status.
 * Not a BaseEntity because voice states don't have their own ID.
 */
export class VoiceState {
    readonly client: Client;
    guildId!: Snowflake;
    channelId!: Snowflake | null;
    userId!: Snowflake;
    sessionId!: string;
    deaf!: boolean;
    mute!: boolean;
    selfDeaf!: boolean;
    selfMute!: boolean;
    selfStream!: boolean;
    selfVideo!: boolean;
    suppress!: boolean;
    requestToSpeakTimestamp!: Date | null;

    constructor(client: Client, data: APIVoiceState) {
        this.client = client;
        this._patch(data);
    }

    _patch(data: Partial<APIVoiceState>): void {
        if (data.guild_id !== undefined) this.guildId = data.guild_id!;
        if (data.channel_id !== undefined) this.channelId = data.channel_id;
        if (data.user_id !== undefined) this.userId = data.user_id;
        if (data.session_id !== undefined) this.sessionId = data.session_id;
        if (data.deaf !== undefined) this.deaf = data.deaf;
        if (data.mute !== undefined) this.mute = data.mute;
        if (data.self_deaf !== undefined) this.selfDeaf = data.self_deaf;
        if (data.self_mute !== undefined) this.selfMute = data.self_mute;
        if (data.self_stream !== undefined) this.selfStream = data.self_stream;
        else if (this.selfStream === undefined) this.selfStream = false;
        if (data.self_video !== undefined) this.selfVideo = data.self_video;
        if (data.suppress !== undefined) this.suppress = data.suppress;
        if (data.request_to_speak_timestamp !== undefined) {
            this.requestToSpeakTimestamp = data.request_to_speak_timestamp
                ? new Date(data.request_to_speak_timestamp)
                : null;
        }
    }

    /** The guild this voice state belongs to. */
    get guild(): Guild | undefined {
        return this.client.guilds.get(this.guildId);
    }

    /** The member this voice state belongs to. */
    get member(): GuildMember | undefined {
        return this.guild?.members.get(this.userId);
    }

    /** The voice channel, if connected. */
    get channel(): VoiceChannel | undefined {
        if (!this.channelId) return undefined;
        return this.client.channels.get(this.channelId) as VoiceChannel | undefined;
    }
}
