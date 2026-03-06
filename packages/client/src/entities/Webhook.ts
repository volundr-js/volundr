import type { APIWebhook, Snowflake, EditWebhookOptions, APIMessage } from "@volundr/types";
import { WebhookType } from "@volundr/types";
import type { Client } from "../Client.js";
import type { User } from "./User.js";
import type { Guild } from "./Guild.js";
import type { Channel } from "./channels/index.js";
import type { CreateMessageOptions } from "../types.js";
import { CDN } from "../cdn/index.js";

/**
 * Rich webhook entity with methods for managing and sending via webhooks.
 */
export class Webhook {
    readonly client: Client;
    readonly id: Snowflake;
    readonly type: WebhookType;
    readonly guildId: Snowflake | null;
    readonly channelId: Snowflake | null;
    readonly name: string | null;
    readonly avatar: string | null;
    readonly token: string | undefined;
    readonly applicationId: Snowflake | null;
    readonly ownerId: Snowflake | undefined;

    private readonly _raw: APIWebhook;

    constructor(client: Client, data: APIWebhook) {
        this.client = client;
        this._raw = data;
        this.id = data.id;
        this.type = data.type;
        this.guildId = data.guild_id ?? null;
        this.channelId = data.channel_id;
        this.name = data.name;
        this.avatar = data.avatar;
        this.token = data.token;
        this.applicationId = data.application_id;
        this.ownerId = data.user?.id;
    }

    /** The guild this webhook belongs to (from cache). */
    get guild(): Guild | undefined {
        return this.guildId ? this.client.guilds.get(this.guildId) : undefined;
    }

    /** The channel this webhook belongs to (from cache). */
    get channel(): Channel | undefined {
        return this.channelId ? this.client.channels.get(this.channelId) : undefined;
    }

    /** The user who created this webhook (from cache). */
    get owner(): User | undefined {
        return this.ownerId ? this.client.users.get(this.ownerId) : undefined;
    }

    /** The avatar URL of this webhook. */
    avatarURL(options?: { size?: 16 | 32 | 64 | 128 | 256 | 512 | 1024 | 2048 | 4096; format?: "webp" | "png" | "jpg" | "gif" }): string | null {
        if (!this.avatar) return null;
        return CDN.avatar(this.id, this.avatar, options);
    }

    /** Whether this webhook was created by a user (not an application). */
    isIncoming(): boolean {
        return this.type === WebhookType.Incoming;
    }

    /** Whether this webhook was created by a channel follower. */
    isChannelFollower(): boolean {
        return this.type === WebhookType.ChannelFollower;
    }

    /** Whether this webhook was created by an application. */
    isApplicationCreated(): boolean {
        return this.type === WebhookType.Application;
    }

    /** Send a message with this webhook. Requires token. */
    async send(options: CreateMessageOptions): Promise<APIMessage | void> {
        if (!this.token) throw new Error("Cannot send with this webhook: no token available");
        return this.client.executeWebhook(this.id, this.token, options);
    }

    /** Edit this webhook. */
    async edit(data: EditWebhookOptions, reason?: string): Promise<Webhook> {
        const raw = await this.client.editWebhook(this.id, data, reason);
        return new Webhook(this.client, raw);
    }

    /** Delete this webhook. */
    async delete(reason?: string): Promise<void> {
        await this.client.deleteWebhook(this.id, reason);
    }

    /** Fetch a message sent by this webhook. */
    async fetchMessage(messageId: Snowflake): Promise<APIMessage> {
        if (!this.token) throw new Error("Cannot fetch message: no token available");
        return this.client.rest.get<APIMessage>(`/webhooks/${this.id}/${this.token}/messages/${messageId}`);
    }

    /** Edit a message sent by this webhook. */
    async editMessage(messageId: Snowflake, options: Record<string, unknown>): Promise<APIMessage> {
        if (!this.token) throw new Error("Cannot edit message: no token available");
        return this.client.rest.patch<APIMessage>(`/webhooks/${this.id}/${this.token}/messages/${messageId}`, { body: options });
    }

    /** Delete a message sent by this webhook. */
    async deleteMessage(messageId: Snowflake): Promise<void> {
        if (!this.token) throw new Error("Cannot delete message: no token available");
        await this.client.rest.delete(`/webhooks/${this.id}/${this.token}/messages/${messageId}`);
    }

    toString(): string {
        return `<Webhook:${this.id}>`;
    }

    toJSON(): APIWebhook {
        return this._raw;
    }
}
