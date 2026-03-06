import type { APIChannel, Snowflake } from "@volundr/types";
import { GuildChannel, type EditChannelOptions } from "./GuildChannel.js";
import type { Client } from "../../Client.js";
import type { VoiceConnection } from "@volundr/gateway";
import { Message } from "../Message.js";
import { Collection } from "../../collection/Collection.js";
import type { GuildMember } from "../GuildMember.js";
import { type MessageInput, resolveMessageInput } from "../../builders/InlineMessage.js";

export interface EditVoiceChannelOptions extends EditChannelOptions {
    bitrate?: number;
    user_limit?: number;
    rtc_region?: string | null;
}

export class VoiceChannel extends GuildChannel {
    bitrate!: number;
    userLimit!: number;
    rtcRegion!: string | null;
    lastMessageId!: Snowflake | null;

    constructor(client: Client, data: APIChannel) {
        super(client, data);
    }

    override _patch(data: Partial<APIChannel>): void {
        super._patch(data);
        if (data.bitrate !== undefined) this.bitrate = data.bitrate;
        else if (this.bitrate === undefined) this.bitrate = 64000;
        if (data.user_limit !== undefined) this.userLimit = data.user_limit;
        else if (this.userLimit === undefined) this.userLimit = 0;
        if (data.last_message_id !== undefined) this.lastMessageId = data.last_message_id ?? null;
        else if (this.lastMessageId === undefined) this.lastMessageId = null;
        // rtc_region is not in APIChannel type yet, handle raw
        const raw = data as Record<string, unknown>;
        if (raw.rtc_region !== undefined) this.rtcRegion = (raw.rtc_region as string) ?? null;
        else if (this.rtcRegion === undefined) this.rtcRegion = null;
    }

    /** Members currently connected to this voice channel. */
    get members(): Collection<Snowflake, GuildMember> {
        const guild = this.client.guilds.get(this.guildId);
        if (!guild) return new Collection();
        const result = new Collection<Snowflake, GuildMember>();
        for (const [userId, vs] of guild.voiceStates) {
            if (vs.channelId === this.id) {
                const member = guild.members.get(userId);
                if (member) result.set(userId, member);
            }
        }
        return result;
    }

    /** Join this voice channel. */
    join(options?: { selfMute?: boolean; selfDeaf?: boolean }): VoiceConnection {
        return this.client.joinVoiceChannel(this.guildId, this.id, options);
    }

    /** Leave this voice channel. */
    leave(): void {
        this.client.leaveVoiceChannel(this.guildId);
    }

    /** Send a text message in this voice channel. Accepts a string, options object, or inline message callback. */
    async send(options: MessageInput): Promise<Message> {
        const opts = resolveMessageInput(options);
        const data = await this.client.createMessage(this.id, opts);
        return new Message(this.client, data);
    }

    /** Set the channel bitrate. */
    setBitrate(bitrate: number, reason?: string): Promise<this> {
        return this.edit({ bitrate } as EditVoiceChannelOptions, reason);
    }

    /** Set the user limit (0 = unlimited). */
    setUserLimit(limit: number, reason?: string): Promise<this> {
        return this.edit({ user_limit: limit } as EditVoiceChannelOptions, reason);
    }

    override toJSON(): APIChannel {
        return {
            ...super.toJSON(),
            bitrate: this.bitrate,
            user_limit: this.userLimit,
            last_message_id: this.lastMessageId,
        };
    }
}
