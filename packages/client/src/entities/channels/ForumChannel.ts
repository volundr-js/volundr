import type { APIChannel, APIEmbed, APIActionRow, APIForumTag, APIDefaultReaction, Snowflake } from "@volundr/types";
import { GuildChannel } from "./GuildChannel.js";
import { channelFrom, type Channel } from "./index.js";
import type { Client } from "../../Client.js";

export interface CreateForumPostOptions {
    name: string;
    auto_archive_duration?: number;
    rate_limit_per_user?: number;
    message: {
        content?: string;
        embeds?: APIEmbed[];
        components?: APIActionRow[];
        flags?: number;
    };
    applied_tags?: Snowflake[];
}

export class ForumChannel extends GuildChannel {
    defaultAutoArchiveDuration!: number | undefined;
    flags!: number;
    availableTags!: APIForumTag[];
    defaultReactionEmoji!: APIDefaultReaction | null;
    defaultSortOrder!: number | null;
    defaultForumLayout!: number;

    constructor(client: Client, data: APIChannel) {
        super(client, data);
    }

    override _patch(data: Partial<APIChannel>): void {
        super._patch(data);
        if (data.default_auto_archive_duration !== undefined) {
            this.defaultAutoArchiveDuration = data.default_auto_archive_duration;
        }
        if (data.flags !== undefined) this.flags = data.flags;
        else if (this.flags === undefined) this.flags = 0;
        if (data.available_tags !== undefined) this.availableTags = data.available_tags;
        else if (this.availableTags === undefined) this.availableTags = [];
        if (data.default_reaction_emoji !== undefined) this.defaultReactionEmoji = data.default_reaction_emoji ?? null;
        else if (this.defaultReactionEmoji === undefined) this.defaultReactionEmoji = null;
        if (data.default_sort_order !== undefined) this.defaultSortOrder = data.default_sort_order ?? null;
        else if (this.defaultSortOrder === undefined) this.defaultSortOrder = null;
        if (data.default_forum_layout !== undefined) this.defaultForumLayout = data.default_forum_layout;
        else if (this.defaultForumLayout === undefined) this.defaultForumLayout = 0;
    }

    /** Create a new post (thread) in this forum channel. */
    async createPost(options: CreateForumPostOptions, reason?: string): Promise<Channel> {
        const data = await this.client.rest.post<APIChannel>(
            `/channels/${this.id}/threads`,
            { body: options, reason },
        );
        const ch = channelFrom(this.client, data);
        this.client.channels.set(data.id, ch);
        return ch;
    }
}
