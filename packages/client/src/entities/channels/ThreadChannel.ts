import type { APIChannel, APIMessage, APIThreadMetadata, Snowflake } from "@volundr/types";
import { BaseChannel } from "./BaseChannel.js";
import type { Client } from "../../Client.js";
import type { Guild } from "../Guild.js";
import { Message } from "../Message.js";
import type { FetchMessagesOptions } from "../../types.js";
import { type MessageInput, resolveMessageInput } from "../../builders/InlineMessage.js";

export interface EditThreadOptions {
    name?: string;
    archived?: boolean;
    locked?: boolean;
    auto_archive_duration?: number;
    rate_limit_per_user?: number;
    invitable?: boolean;
}

export class ThreadChannel extends BaseChannel {
    guildId!: Snowflake;
    parentId!: Snowflake | null;
    ownerId!: Snowflake | null;
    lastMessageId!: Snowflake | null;
    threadMetadata!: APIThreadMetadata | undefined;
    rateLimitPerUser!: number;
    totalMessageSent!: number;

    constructor(client: Client, data: APIChannel) {
        super(client, data);
    }

    override _patch(data: Partial<APIChannel>): void {
        super._patch(data);
        if (data.guild_id !== undefined) this.guildId = data.guild_id!;
        if (data.parent_id !== undefined) this.parentId = data.parent_id ?? null;
        else if (this.parentId === undefined) this.parentId = null;
        if (data.owner_id !== undefined) this.ownerId = data.owner_id ?? null;
        else if (this.ownerId === undefined) this.ownerId = null;
        if (data.last_message_id !== undefined) this.lastMessageId = data.last_message_id ?? null;
        else if (this.lastMessageId === undefined) this.lastMessageId = null;
        if (data.thread_metadata !== undefined) this.threadMetadata = data.thread_metadata;
        if (data.rate_limit_per_user !== undefined) this.rateLimitPerUser = data.rate_limit_per_user;
        else if (this.rateLimitPerUser === undefined) this.rateLimitPerUser = 0;
        if (data.total_message_sent !== undefined) this.totalMessageSent = data.total_message_sent;
        else if (this.totalMessageSent === undefined) this.totalMessageSent = 0;
    }

    /** The guild this thread belongs to. */
    get guild(): Guild | undefined {
        return this.client.guilds.get(this.guildId);
    }

    /** Whether this thread is archived. */
    get archived(): boolean {
        return this.threadMetadata?.archived ?? false;
    }

    /** Whether this thread is locked. */
    get locked(): boolean {
        return this.threadMetadata?.locked ?? false;
    }

    /** Edit this thread. */
    async edit(data: EditThreadOptions, reason?: string): Promise<this> {
        const result = await this.client.rest.patch<APIChannel>(
            `/channels/${this.id}`,
            { body: data, reason },
        );
        this._patch(result);
        return this;
    }

    /** Archive this thread. */
    archive(reason?: string): Promise<this> {
        return this.edit({ archived: true }, reason);
    }

    /** Unarchive this thread. */
    unarchive(reason?: string): Promise<this> {
        return this.edit({ archived: false }, reason);
    }

    /** Lock this thread. */
    lock(reason?: string): Promise<this> {
        return this.edit({ locked: true }, reason);
    }

    /** Unlock this thread. */
    unlock(reason?: string): Promise<this> {
        return this.edit({ locked: false }, reason);
    }

    /** Set the auto-archive duration (minutes: 60, 1440, 4320, 10080). */
    setAutoArchiveDuration(duration: number, reason?: string): Promise<this> {
        return this.edit({ auto_archive_duration: duration }, reason);
    }

    /** Add a member to this thread. */
    addMember(userId: Snowflake): Promise<void> {
        return this.client.addThreadMember(this.id, userId);
    }

    /** Remove a member from this thread. */
    removeMember(userId: Snowflake): Promise<void> {
        return this.client.removeThreadMember(this.id, userId);
    }

    /** Join this thread (add the bot). */
    join(): Promise<void> {
        return this.client.joinThread(this.id);
    }

    /** Leave this thread (remove the bot). */
    leave(): Promise<void> {
        return this.client.leaveThread(this.id);
    }

    /** Send a message in this thread. Accepts a string, options object, or inline message callback. */
    async send(options: MessageInput): Promise<Message> {
        const opts = resolveMessageInput(options);
        const data = await this.client.createMessage(this.id, opts);
        return new Message(this.client, data);
    }

    /** Fetch messages from this thread. */
    async fetchMessages(options?: FetchMessagesOptions): Promise<Message[]> {
        const data = await this.client.fetchMessages(this.id, options);
        return data.map((d: APIMessage) => new Message(this.client, d));
    }
}
