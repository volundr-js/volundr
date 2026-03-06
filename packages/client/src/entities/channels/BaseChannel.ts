import type { APIChannel, Snowflake, ChannelType } from "@volundr/types";
import { BaseEntity } from "../Base.js";
import type { Client } from "../../Client.js";
import type { TextChannel } from "./TextChannel.js";
import type { VoiceChannel } from "./VoiceChannel.js";
import type { CategoryChannel } from "./CategoryChannel.js";
import type { DMChannel } from "./DMChannel.js";
import type { AnnouncementChannel } from "./AnnouncementChannel.js";
import type { ForumChannel } from "./ForumChannel.js";
import type { StageChannel } from "./StageChannel.js";
import type { ThreadChannel } from "./ThreadChannel.js";
import { ChannelType as CT } from "@volundr/types";

export type Channel =
    | TextChannel
    | VoiceChannel
    | CategoryChannel
    | DMChannel
    | AnnouncementChannel
    | ForumChannel
    | StageChannel
    | ThreadChannel
    | BaseChannel;

/** Channels that support text messages. */
export type TextBasedChannel = TextChannel | VoiceChannel | DMChannel | AnnouncementChannel | ThreadChannel;

/** Channels that support voice. */
export type VoiceBasedChannel = VoiceChannel | StageChannel;

export class BaseChannel extends BaseEntity {
    type!: ChannelType;
    name!: string | null;

    constructor(client: Client, data: APIChannel) {
        super(client, data.id);
        this._patch(data);
    }

    _patch(data: Partial<APIChannel>): void {
        if (data.type !== undefined) this.type = data.type;
        if (data.name !== undefined) this.name = data.name ?? null;
    }

    /** Fetch fresh channel data from the API. */
    async fetch(): Promise<Channel> {
        const data = await this.client.rest.get<APIChannel>(`/channels/${this.id}`);
        this._patch(data);
        return this as unknown as Channel;
    }

    /** Delete this channel. */
    async delete(reason?: string): Promise<void> {
        await this.client.rest.delete(`/channels/${this.id}`, { reason });
    }

    /** Type guard: is this a text-based channel? */
    isTextBased(): this is TextBasedChannel {
        return [CT.GuildText, CT.GuildVoice, CT.DM, CT.GuildAnnouncement,
            CT.AnnouncementThread, CT.PublicThread, CT.PrivateThread].includes(this.type);
    }

    /** Type guard: is this a voice-based channel? */
    isVoiceBased(): this is VoiceBasedChannel {
        return [CT.GuildVoice, CT.GuildStageVoice].includes(this.type);
    }

    /** Type guard: is this a DM channel? */
    isDMBased(): this is DMChannel {
        return [CT.DM, CT.GroupDM].includes(this.type);
    }

    /** Type guard: is this a thread? */
    isThread(): this is ThreadChannel {
        return [CT.AnnouncementThread, CT.PublicThread, CT.PrivateThread].includes(this.type);
    }

    /** Mention string. */
    toString(): string {
        return `<#${this.id}>`;
    }

    toJSON(): APIChannel {
        return {
            id: this.id,
            type: this.type,
            name: this.name,
        };
    }
}
