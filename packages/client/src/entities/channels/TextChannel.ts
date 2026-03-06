import type { APIChannel, APIMessage, Snowflake } from "@volundr/types";
import { GuildChannel, type EditChannelOptions } from "./GuildChannel.js";
import { channelFrom, type Channel } from "./index.js";
import type { Client } from "../../Client.js";
import { Message } from "../Message.js";
import type { Collection } from "../../collection/Collection.js";
import type { CreateMessageOptions, FetchMessagesOptions } from "../../types.js";
import { type MessageInput, resolveMessageInput } from "../../builders/InlineMessage.js";
import { MessageCollector, type CollectorOptions } from "../../collectors/MessageCollector.js";

export interface EditTextChannelOptions extends EditChannelOptions {
    topic?: string | null;
    nsfw?: boolean;
    rate_limit_per_user?: number;
    default_auto_archive_duration?: number;
}

export class TextChannel extends GuildChannel {
    topic!: string | null;
    nsfw!: boolean;
    rateLimitPerUser!: number;
    lastMessageId!: Snowflake | null;
    defaultAutoArchiveDuration!: number | undefined;

    constructor(client: Client, data: APIChannel) {
        super(client, data);
    }

    override _patch(data: Partial<APIChannel>): void {
        super._patch(data);
        if (data.topic !== undefined) this.topic = data.topic ?? null;
        else if (this.topic === undefined) this.topic = null;
        if (data.nsfw !== undefined) this.nsfw = data.nsfw;
        else if (this.nsfw === undefined) this.nsfw = false;
        if (data.rate_limit_per_user !== undefined) this.rateLimitPerUser = data.rate_limit_per_user;
        else if (this.rateLimitPerUser === undefined) this.rateLimitPerUser = 0;
        if (data.last_message_id !== undefined) this.lastMessageId = data.last_message_id ?? null;
        else if (this.lastMessageId === undefined) this.lastMessageId = null;
        if (data.default_auto_archive_duration !== undefined) {
            this.defaultAutoArchiveDuration = data.default_auto_archive_duration;
        }
    }

    /** Send a message to this channel. Accepts a string, options object, or inline message callback. */
    async send(options: MessageInput): Promise<Message> {
        const opts = resolveMessageInput(options);
        const data = await this.client.createMessage(this.id, opts);
        return new Message(this.client, data);
    }

    /** Fetch messages from this channel. */
    async fetchMessages(options?: FetchMessagesOptions): Promise<Message[]> {
        const data = await this.client.fetchMessages(this.id, options);
        return data.map((d: APIMessage) => new Message(this.client, d));
    }

    /** Bulk delete messages (2-100, not older than 14 days). */
    async bulkDelete(messagesOrCount: number | Snowflake[], filterOld = false): Promise<void> {
        let messageIds: Snowflake[];
        if (typeof messagesOrCount === "number") {
            const fetched = await this.client.fetchMessages(this.id, { limit: messagesOrCount });
            messageIds = fetched.map((m: APIMessage) => m.id);
        } else {
            messageIds = messagesOrCount;
        }

        if (filterOld) {
            const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
            messageIds = messageIds.filter((id) => {
                const timestamp = Number(BigInt(id) >> 22n) + 1420070400000;
                return timestamp > twoWeeksAgo;
            });
        }

        if (messageIds.length === 0) return;
        if (messageIds.length === 1) {
            await this.client.deleteMessage(this.id, messageIds[0]);
            return;
        }

        await this.client.bulkDeleteMessages(this.id, messageIds);
    }

    /** Set the channel topic. */
    setTopic(topic: string | null, reason?: string): Promise<this> {
        return this.edit({ topic } as EditTextChannelOptions, reason);
    }

    /** Set the NSFW flag. */
    setNSFW(nsfw: boolean, reason?: string): Promise<this> {
        return this.edit({ nsfw } as EditTextChannelOptions, reason);
    }

    /** Set the slowmode (rate limit per user) in seconds. */
    setRateLimitPerUser(limit: number, reason?: string): Promise<this> {
        return this.edit({ rate_limit_per_user: limit } as EditTextChannelOptions, reason);
    }

    /** Create a message collector for this channel. */
    createMessageCollector(options?: CollectorOptions): MessageCollector {
        return this.client.createMessageCollector(this.id, options);
    }

    /** Await messages in this channel. Returns collected messages. */
    awaitMessages(options?: CollectorOptions): Promise<Collection<Snowflake, Message>> {
        return this.client.awaitMessages(this.id, options);
    }

    /** Trigger the typing indicator in this channel. */
    sendTyping(): Promise<void> {
        return this.client.triggerTyping(this.id);
    }

    /** Create a thread without a message in this channel. */
    async createThread(options: { name: string; type?: number; auto_archive_duration?: number; invitable?: boolean; rate_limit_per_user?: number }, reason?: string): Promise<Channel> {
        const data = await this.client.startThreadWithoutMessage(this.id, options, reason);
        const ch = channelFrom(this.client, data);
        this.client.channels.set(data.id, ch);
        return ch;
    }

    /** Fetch pinned messages in this channel. */
    async fetchPinnedMessages(): Promise<Message[]> {
        const data = await this.client.fetchPinnedMessages(this.id);
        return data.map((d: APIMessage) => new Message(this.client, d));
    }

    override toJSON(): APIChannel {
        return {
            ...super.toJSON(),
            topic: this.topic,
            nsfw: this.nsfw,
            rate_limit_per_user: this.rateLimitPerUser,
            last_message_id: this.lastMessageId,
            default_auto_archive_duration: this.defaultAutoArchiveDuration,
        };
    }
}
