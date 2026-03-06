import type {
    APIMessage, APIEmbed, APIAttachment, APIReaction, APIMessageReference,
    APIMessageComponent, APIStickerItem, APIUser, APIGuildMember,
    APIChannel, Snowflake, MessageType,
} from "@volundr/types";
import { BaseEntity } from "./Base.js";
import type { Client } from "../Client.js";
import type { User } from "./User.js";
import type { GuildMember } from "./GuildMember.js";
import type { Guild } from "./Guild.js";
import type { Channel } from "./channels/index.js";
import type { CreateMessageOptions, EditMessageOptions } from "../types.js";
import { InlineMessage, type MessageInput, resolveMessageInput } from "../builders/InlineMessage.js";

export class Message extends BaseEntity {
    channelId!: Snowflake;
    guildId!: Snowflake | null;
    content!: string;
    tts!: boolean;
    mentionEveryone!: boolean;
    mentions!: APIUser[];
    mentionRoleIds!: Snowflake[];
    attachments!: APIAttachment[];
    embeds!: APIEmbed[];
    reactions!: APIReaction[];
    nonce!: string | number | undefined;
    pinned!: boolean;
    webhookId!: Snowflake | undefined;
    type!: MessageType;
    messageReference!: APIMessageReference | undefined;
    flags!: number;
    referencedMessage!: Message | null;
    components!: APIMessageComponent[];
    stickerItems!: APIStickerItem[];

    /** The author as a User entity. Set by EntityFactory/CacheManager. */
    author!: User;

    /** The author as a GuildMember (null in DMs). Set by EntityFactory/CacheManager. */
    member!: GuildMember | null;

    /** Raw member data for serialization fallback (member may not be resolved). */
    private _memberData!: APIGuildMember | undefined;

    /** Lazy Date: raw ISO strings, Date objects created on first access. */
    private _rawTimestamp!: string;
    private _cachedTimestamp: Date | undefined;
    private _rawEditedTimestamp!: string | null;
    private _cachedEditedTimestamp: Date | null | undefined;

    /** Timestamp when this message was sent. Lazily parsed from ISO string. */
    get timestamp(): Date {
        return this._cachedTimestamp ??= new Date(this._rawTimestamp);
    }

    /** Timestamp when this message was last edited. Lazily parsed. */
    get editedTimestamp(): Date | null {
        if (this._rawEditedTimestamp === null) return null;
        if (this._cachedEditedTimestamp !== undefined) return this._cachedEditedTimestamp;
        this._cachedEditedTimestamp = new Date(this._rawEditedTimestamp);
        return this._cachedEditedTimestamp;
    }

    constructor(client: Client, data: APIMessage) {
        super(client, data.id);
        this._patch(data);
    }

    _patch(data: Partial<APIMessage>): void {
        if (data.channel_id !== undefined) this.channelId = data.channel_id;
        if (data.guild_id !== undefined) this.guildId = data.guild_id ?? null;
        else if (this.guildId === undefined) this.guildId = null;
        if (data.content !== undefined) this.content = data.content;
        if (data.timestamp !== undefined) {
            this._rawTimestamp = data.timestamp;
            this._cachedTimestamp = undefined;
        }
        if (data.edited_timestamp !== undefined) {
            this._rawEditedTimestamp = data.edited_timestamp ?? null;
            this._cachedEditedTimestamp = undefined;
        }
        if (data.tts !== undefined) this.tts = data.tts;
        if (data.mention_everyone !== undefined) this.mentionEveryone = data.mention_everyone;
        if (data.mentions !== undefined) this.mentions = data.mentions;
        else if (this.mentions === undefined) this.mentions = [];
        if (data.mention_roles !== undefined) this.mentionRoleIds = data.mention_roles;
        else if (this.mentionRoleIds === undefined) this.mentionRoleIds = [];
        if (data.attachments !== undefined) this.attachments = data.attachments;
        else if (this.attachments === undefined) this.attachments = [];
        if (data.embeds !== undefined) this.embeds = data.embeds;
        else if (this.embeds === undefined) this.embeds = [];
        if (data.reactions !== undefined) this.reactions = data.reactions;
        else if (this.reactions === undefined) this.reactions = [];
        if (data.nonce !== undefined) this.nonce = data.nonce;
        if (data.pinned !== undefined) this.pinned = data.pinned;
        if (data.webhook_id !== undefined) this.webhookId = data.webhook_id;
        if (data.type !== undefined) this.type = data.type;
        if (data.message_reference !== undefined) this.messageReference = data.message_reference;
        if (data.flags !== undefined) this.flags = data.flags;
        else if (this.flags === undefined) this.flags = 0;
        if (data.components !== undefined) this.components = data.components;
        else if (this.components === undefined) this.components = [];
        if (data.sticker_items !== undefined) this.stickerItems = data.sticker_items;
        else if (this.stickerItems === undefined) this.stickerItems = [];

        // Store raw member data for toJSON
        if (data.member !== undefined) this._memberData = data.member;
    }

    /** The channel this message was sent in. */
    get channel(): Channel | undefined {
        return this.client.channels.get(this.channelId);
    }

    /** The guild this message was sent in (null for DMs). */
    get guild(): Guild | undefined {
        return this.guildId ? this.client.guilds.get(this.guildId) : undefined;
    }

    /** Whether this message is in a guild. */
    inGuild(): boolean {
        return this.guildId !== null;
    }

    /** Whether this message is in a DM. */
    inDM(): boolean {
        return this.guildId === null;
    }

    /** Jump-to URL for this message. */
    get url(): string {
        return `https://discord.com/channels/${this.guildId ?? "@me"}/${this.channelId}/${this.id}`;
    }

    /**
     * Content with user/role/channel mentions resolved to readable names.
     * Falls back to raw mention syntax if entities are not cached.
     */
    get cleanContent(): string {
        let result = this.content;

        // Replace user mentions
        result = result.replace(/<@!?(\d+)>/g, (match, id: string) => {
            const user = this.client.users.get(id);
            if (user) return `@${user.displayName ?? user.username}`;
            const mention = this.mentions.find(u => u.id === id);
            return mention ? `@${mention.global_name ?? mention.username}` : match;
        });

        // Replace role mentions
        result = result.replace(/<@&(\d+)>/g, (match, id: string) => {
            const guild = this.guild;
            if (!guild) return match;
            const role = guild.roles.get(id);
            return role ? `@${role.name}` : match;
        });

        // Replace channel mentions
        result = result.replace(/<#(\d+)>/g, (match, id: string) => {
            const channel = this.client.channels.get(id);
            return channel && "name" in channel ? `#${(channel as { name: string }).name}` : match;
        });

        return result;
    }

    /** Reply to this message. Accepts a string, options object, or inline message callback. */
    async reply(options: MessageInput): Promise<Message> {
        const opts = resolveMessageInput(options);
        const data = await this.client.createMessage(this.channelId, {
            ...opts,
            reply_to: this.id,
        });
        return new Message(this.client, data);
    }

    /** Edit this message. Accepts a string, options object, or inline message callback. */
    async edit(options: EditMessageOptions | string | ((msg: InlineMessage) => void)): Promise<Message> {
        const opts = typeof options === "function"
            ? resolveMessageInput(options) as EditMessageOptions
            : typeof options === "string" ? { content: options } : options;
        const data = await this.client.editMessage(this.channelId, this.id, opts);
        this._patch(data);
        return this;
    }

    /** Delete this message. */
    async delete(reason?: string): Promise<void> {
        await this.client.deleteMessage(this.channelId, this.id, reason);
    }

    /** Add a reaction to this message. */
    async react(emoji: string): Promise<void> {
        await this.client.addReaction(this.channelId, this.id, emoji);
    }

    /** Remove a reaction. If userId is omitted, removes the bot's own reaction. */
    async removeReaction(emoji: string, userId?: Snowflake): Promise<void> {
        await this.client.removeReaction(this.channelId, this.id, emoji, userId);
    }

    /** Toggle embed suppression on this message. */
    async suppressEmbeds(suppress = true): Promise<Message> {
        const SUPPRESS_EMBEDS = 1 << 2;
        const newFlags = suppress
            ? (this.flags | SUPPRESS_EMBEDS)
            : (this.flags & ~SUPPRESS_EMBEDS);
        const data = await this.client.editMessage(this.channelId, this.id, { flags: newFlags });
        this._patch(data);
        return this;
    }

    /** Pin this message. */
    async pin(reason?: string): Promise<void> {
        await this.client.pinMessage(this.channelId, this.id, reason);
    }

    /** Unpin this message. */
    async unpin(reason?: string): Promise<void> {
        await this.client.unpinMessage(this.channelId, this.id, reason);
    }

    /** Crosspost (publish) this message (announcement channels only). */
    async crosspost(): Promise<Message> {
        const data = await this.client.rest.post<APIMessage>(
            `/channels/${this.channelId}/messages/${this.id}/crosspost`,
        );
        this._patch(data);
        return this;
    }

    /** Create a thread from this message. */
    async createThread(options: { name: string; auto_archive_duration?: number; rate_limit_per_user?: number }, reason?: string): Promise<APIChannel> {
        return this.client.startThreadFromMessage(this.channelId, this.id, options, reason);
    }

    /** Fetch users who reacted with a specific emoji. */
    async fetchReactions(emoji: string, options?: { limit?: number; after?: Snowflake }): Promise<APIUser[]> {
        return this.client.fetchReactions(this.channelId, this.id, emoji, options);
    }

    /** Remove all reactions from this message. */
    async removeAllReactions(): Promise<void> {
        await this.client.removeAllReactions(this.channelId, this.id);
    }

    /** Remove all reactions for a specific emoji from this message. */
    async removeReactionEmoji(emoji: string): Promise<void> {
        await this.client.removeAllReactionsForEmoji(this.channelId, this.id, emoji);
    }

    /** Create a component collector on this message. */
    createComponentCollector(options?: import("../collectors/index.js").ComponentCollectorOptions) {
        return this.client.createComponentCollector(this.id, options);
    }

    /** Await component interactions on this message. */
    awaitComponents(options?: import("../collectors/index.js").ComponentCollectorOptions) {
        return this.client.awaitComponents(this.id, options);
    }

    /** Create a reaction collector on this message. */
    createReactionCollector(options?: import("../collectors/index.js").ReactionCollectorOptions) {
        return this.client.createReactionCollector(this.id, options);
    }

    /** Await reactions on this message. */
    awaitReactions(options?: import("../collectors/index.js").ReactionCollectorOptions) {
        return this.client.awaitReactions(this.id, options);
    }

    /** Fetch fresh message data from the API. */
    async fetch(): Promise<Message> {
        const data = await this.client.rest.get<APIMessage>(
            `/channels/${this.channelId}/messages/${this.id}`,
        );
        this._patch(data);
        return this;
    }

    /** The message content. */
    toString(): string {
        return this.content;
    }

    toJSON(): APIMessage {
        return {
            id: this.id,
            channel_id: this.channelId,
            guild_id: this.guildId ?? undefined,
            author: this.author?.toJSON(),
            member: this._memberData,
            content: this.content,
            timestamp: this._rawTimestamp,
            edited_timestamp: this._rawEditedTimestamp ?? null,
            tts: this.tts,
            mention_everyone: this.mentionEveryone,
            mentions: this.mentions,
            mention_roles: this.mentionRoleIds,
            attachments: this.attachments,
            embeds: this.embeds,
            reactions: this.reactions,
            nonce: this.nonce,
            pinned: this.pinned,
            webhook_id: this.webhookId,
            type: this.type,
            message_reference: this.messageReference,
            flags: this.flags,
            components: this.components,
            sticker_items: this.stickerItems,
        };
    }
}
