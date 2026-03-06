import { Logger } from "@volundr/logger";
import { RestClient } from "@volundr/rest";
import { Gateway, ShardManager, VoiceConnection } from "@volundr/gateway";
import type { GatewayStatus, GatewayPresence } from "@volundr/gateway";
import { ThreadPool } from "@volundr/threads";
import type { ThreadPoolOptions } from "@volundr/threads";
import {
    TypedEmitter,
    GatewayEvent,
    InteractionResponseType,
} from "@volundr/types";
import type {
    APIUser,
    APIGuild,
    APIChannel,
    APIMessage,
    APIInteraction,
    GatewayReadyData,
    GatewayVoiceServerUpdateData,
    GatewayGuildMemberAddData,
    GatewayGuildMembersChunkData,
    GatewayGuild,
    Snowflake,
    APIGuildMember,
    APIRole,
    APIVoiceState,
    APIApplicationCommand,
    CreateApplicationCommandData,
    APIApplicationCommandOptionChoice,
    APIEmoji,
    APIAuditLog,
    APIInvite,
    APIInviteMetadata,
    CreateInviteOptions,
    APIWebhook,
    CreateWebhookOptions,
    EditWebhookOptions,
    APISticker,
    APIGuildTemplate,
    APIGuildScheduledEvent,
    APIStageInstance,
    APIAutoModerationRule,
    APIThreadMember,
    GatewayMessageReactionAddData,
} from "@volundr/types";
import { Message } from "./entities/Message.js";
import type {
    ClientOptions, ClientEvents, CreateMessageOptions, EditMessageOptions,
    BanOptions, EditMemberOptions, CreateRoleOptions, CreateChannelOptions,
    FetchMessagesOptions, InteractionResponseOptions, ListMembersOptions,
    PruneMembersOptions, PruneResult, GuildBan, GetAuditLogOptions,
    RequestGuildMembersOptions, FetchMembersOptions, PermissionOverwriteData,
    GuildWidgetSettings, GuildVanityUrl,
} from "./types.js";
import { Collection } from "./collection/Collection.js";
import { CacheManager, Sweepers } from "./cache/index.js";
import { MessageCollector, ComponentCollector, ReactionCollector } from "./collectors/index.js";
import type { CollectorOptions, ComponentCollectorOptions, ReactionCollectorOptions } from "./collectors/index.js";
import type { Guild } from "./entities/Guild.js";
import type { GuildMember } from "./entities/GuildMember.js";
import type { Channel } from "./entities/channels/index.js";
import type { User } from "./entities/User.js";
import { validateIntentsForEvent, logIntentsSummary } from "./utils/IntentsValidator.js";
import type { Interaction } from "./entities/interactions/index.js";
import type { ChatInputInteraction } from "./entities/interactions/ChatInputInteraction.js";
import type { AutocompleteInteraction } from "./entities/interactions/AutocompleteInteraction.js";
import type { ButtonInteraction } from "./entities/interactions/ButtonInteraction.js";
import type { SelectMenuInteraction } from "./entities/interactions/SelectMenuInteraction.js";
import type { ModalSubmitInteraction } from "./entities/interactions/ModalSubmitInteraction.js";
import type { ContextMenuInteraction } from "./entities/interactions/ContextMenuInteraction.js";

type ComponentEntry<T> = { match: string | RegExp; handler: (interaction: T) => void | Promise<void> };

const log = Logger.getLogger("client", "Client");

export class Client extends TypedEmitter<ClientEvents> {
    readonly rest: RestClient;
    readonly gateway: Gateway | null;
    readonly shardManager: ShardManager | null;
    readonly pool: ThreadPool | null;
    private readonly cache: CacheManager;
    private sweepers: Sweepers | null = null;

    /** All cached guilds. */
    readonly guilds = new Collection<Snowflake, Guild>();
    /** All cached channels (flat - includes guild channels, DMs, threads). */
    readonly channels = new Collection<Snowflake, Channel>();
    /** All cached users. */
    readonly users = new Collection<Snowflake, User>();

    /** The bot user. Set after READY. */
    user: User | null = null;
    /** Timestamp (ms since epoch) when the client became ready. */
    readyTimestamp: number | null = null;
    /** Basic application info from READY event. */
    application: { id: Snowflake; flags: number } | null = null;
    private ready = false;
    private readonly voiceConnections = new Map<Snowflake, VoiceConnection>();

    // Interaction routing
    private readonly commandHandlers = new Map<string, (i: ChatInputInteraction) => void | Promise<void>>();
    private readonly autocompleteHandlers = new Map<string, (i: AutocompleteInteraction) => void | Promise<void>>();
    private readonly contextMenuHandlers = new Map<string, (i: ContextMenuInteraction) => void | Promise<void>>();
    private readonly buttonHandlers: ComponentEntry<ButtonInteraction>[] = [];
    private readonly selectMenuHandlers: ComponentEntry<SelectMenuInteraction>[] = [];
    private readonly modalHandlers: ComponentEntry<ModalSubmitInteraction>[] = [];

    constructor(private readonly options: ClientOptions) {
        super();

        this.rest = new RestClient({
            token: options.token,
            apiVersion: options.apiVersion,
            baseUrl: options.baseUrl,
            maxRetries: options.maxRetries,
        });

        this.pool = options.pool
            ? new ThreadPool(typeof options.pool === "object" ? options.pool : undefined)
            : null;

        if (options.shardCount) {
            this.gateway = null;
            this.shardManager = new ShardManager({
                token: options.token,
                intents: options.intents,
                shardCount: options.shardCount,
                largeThreshold: options.largeThreshold,
                presence: options.presence,
                compress: options.compress,
                rest: this.rest,
                apiVersion: options.apiVersion,
                baseUrl: options.baseUrl,
                maxRetries: options.maxRetries,
            });

            this.cache = new CacheManager(this, this.shardManager, options.messageCacheLimit);
        } else {
            this.shardManager = null;
            this.gateway = new Gateway({
                token: options.token,
                intents: options.intents,
                rest: this.rest,
                largeThreshold: options.largeThreshold,
                presence: options.presence,
                compress: options.compress,
            });

            this.cache = new CacheManager(this, this.gateway, options.messageCacheLimit);
        }

        this.setupListeners();

        if (options.sweepers) {
            this.sweepers = new Sweepers(this, options.sweepers);
        }
    }

    // --- Lifecycle ---

    async connect(): Promise<void> {
        logIntentsSummary(this.options.intents);
        log.info("Connecting...");

        if (this.shardManager) {
            return new Promise<void>((resolve, reject) => {
                const onReady = (data: GatewayReadyData) => {
                    this.user = this.users.get(data.user.id) ?? null;
                    this.application = data.application ? { id: data.application.id, flags: data.application.flags ?? 0 } : null;
                };

                const onAllReady = () => {
                    this.shardManager!.off("allReady", onAllReady);
                    this.ready = true;
                    this.readyTimestamp = Date.now();
                    log.info(`All shards ready (${this.shardManager!.getShardCount()} shards)`);
                    this.emit("ready", undefined as void);
                    resolve();
                };

                this.shardManager!.on("READY", onReady);
                this.shardManager!.on("allReady", onAllReady);
                this.shardManager!.connect().catch(reject);
            });
        }

        return new Promise<void>((resolve, reject) => {
            const onReady = (data: GatewayReadyData) => {
                this.gateway!.off("READY", onReady);
                this.gateway!.off("close", onClose);

                this.user = this.users.get(data.user.id) ?? null;
                this.application = data.application ? { id: data.application.id, flags: data.application.flags ?? 0 } : null;
                this.ready = true;
                this.readyTimestamp = Date.now();

                log.info(`Ready as ${data.user.username} (${data.user.id})`);
                this.emit("ready", undefined as void);
                resolve();
            };

            const onClose = (code: number) => {
                this.gateway!.off("READY", onReady);
                this.gateway!.off("close", onClose);
                reject(new Error(`Gateway closed during connect (code=${code})`));
            };

            this.gateway!.on("READY", onReady);
            this.gateway!.on("close", onClose);
            this.gateway!.connect().catch(reject);
        });
    }

    disconnect(): void {
        this.ready = false;
        this.readyTimestamp = null;
        this.user = null;
        this.application = null;
        this.cache.clear();

        this.sweepers?.destroy();
        this.sweepers = null;

        for (const conn of this.voiceConnections.values()) {
            conn.disconnect();
        }
        this.voiceConnections.clear();

        this.pool?.terminate();

        if (this.shardManager) {
            this.shardManager.disconnect();
        } else {
            this.gateway!.disconnect();
        }

        log.info("Disconnected");
    }

    /** Enables `await using client = new Client(...)` for automatic cleanup. */
    async [Symbol.asyncDispose](): Promise<void> {
        this.disconnect();
    }

    isReady(): boolean {
        return this.ready;
    }

    /** The time the client became ready as a Date, or null if not yet ready. */
    get readyAt(): Date | null {
        return this.readyTimestamp !== null ? new Date(this.readyTimestamp) : null;
    }

    /** How long the client has been ready, in milliseconds. */
    get uptime(): number | null {
        return this.readyTimestamp !== null ? Date.now() - this.readyTimestamp : null;
    }

    getStatus(): GatewayStatus | Map<number, GatewayStatus> {
        if (this.shardManager) {
            return this.shardManager.getStatus();
        }
        return this.gateway!.getStatus();
    }

    getShard(guildId: Snowflake): number | undefined {
        return this.shardManager?.getShard(guildId);
    }

    // --- Cache helpers ---

    getMessage(channelId: Snowflake, messageId: Snowflake): Message | undefined {
        return this.cache.getMessage(channelId, messageId);
    }

    /** Access the internal message cache (per-channel). Used by Sweepers. */
    get messageCache(): Collection<Snowflake, Collection<Snowflake, Message>> {
        return this.cache.messages;
    }

    // --- REST: Messages ---

    fetchMessages(channelId: Snowflake, options: FetchMessagesOptions = {}): Promise<APIMessage[]> {
        const query: Record<string, string> = {};
        if (options.limit) query.limit = String(options.limit);
        if (options.before) query.before = options.before;
        if (options.after) query.after = options.after;
        if (options.around) query.around = options.around;
        return this.rest.get<APIMessage[]>(`/channels/${channelId}/messages`, { query });
    }

    createMessage(channelId: Snowflake, options: CreateMessageOptions): Promise<APIMessage> {
        const body: Record<string, unknown> = {};
        if (options.content !== undefined) body.content = options.content;
        if (options.embeds !== undefined) body.embeds = options.embeds;
        if (options.components !== undefined) body.components = options.components;
        if (options.flags !== undefined) body.flags = options.flags;
        if (options.tts !== undefined) body.tts = options.tts;
        if (options.reply_to !== undefined) {
            body.message_reference = { message_id: options.reply_to };
        }
        if (options.allowed_mentions !== undefined) body.allowed_mentions = options.allowed_mentions;
        return this.rest.post<APIMessage>(`/channels/${channelId}/messages`, { body, files: options.files });
    }

    editMessage(channelId: Snowflake, messageId: Snowflake, options: EditMessageOptions): Promise<APIMessage> {
        const { files, ...body } = options;
        return this.rest.patch<APIMessage>(`/channels/${channelId}/messages/${messageId}`, { body, files });
    }

    deleteMessage(channelId: Snowflake, messageId: Snowflake, reason?: string): Promise<void> {
        return this.rest.delete(`/channels/${channelId}/messages/${messageId}`, { reason });
    }

    bulkDeleteMessages(channelId: Snowflake, messageIds: Snowflake[], reason?: string): Promise<void> {
        return this.rest.post(`/channels/${channelId}/messages/bulk-delete`, {
            body: { messages: messageIds },
            reason,
        });
    }

    pinMessage(channelId: Snowflake, messageId: Snowflake, reason?: string): Promise<void> {
        return this.rest.put(`/channels/${channelId}/pins/${messageId}`, { reason });
    }

    unpinMessage(channelId: Snowflake, messageId: Snowflake, reason?: string): Promise<void> {
        return this.rest.delete(`/channels/${channelId}/pins/${messageId}`, { reason });
    }

    addReaction(channelId: Snowflake, messageId: Snowflake, emoji: string): Promise<void> {
        return this.rest.put(`/channels/${channelId}/messages/${messageId}/reactions/${encodeURIComponent(emoji)}/@me`);
    }

    removeReaction(channelId: Snowflake, messageId: Snowflake, emoji: string, userId?: Snowflake): Promise<void> {
        const target = userId ?? "@me";
        return this.rest.delete(`/channels/${channelId}/messages/${messageId}/reactions/${encodeURIComponent(emoji)}/${target}`);
    }

    // --- REST: Guilds ---

    fetchGuild(guildId: Snowflake): Promise<APIGuild> {
        return this.rest.get<APIGuild>(`/guilds/${guildId}`);
    }

    editGuild(guildId: Snowflake, data: Partial<APIGuild>, reason?: string): Promise<APIGuild> {
        return this.rest.patch<APIGuild>(`/guilds/${guildId}`, { body: data, reason });
    }

    leaveGuild(guildId: Snowflake): Promise<void> {
        return this.rest.delete(`/users/@me/guilds/${guildId}`);
    }

    // --- REST: Channels ---

    fetchChannel(channelId: Snowflake): Promise<APIChannel> {
        return this.rest.get<APIChannel>(`/channels/${channelId}`);
    }

    createChannel(guildId: Snowflake, data: CreateChannelOptions, reason?: string): Promise<APIChannel> {
        return this.rest.post<APIChannel>(`/guilds/${guildId}/channels`, { body: data, reason });
    }

    editChannel(channelId: Snowflake, data: Partial<APIChannel>, reason?: string): Promise<APIChannel> {
        return this.rest.patch<APIChannel>(`/channels/${channelId}`, { body: data, reason });
    }

    deleteChannel(channelId: Snowflake, reason?: string): Promise<void> {
        return this.rest.delete(`/channels/${channelId}`, { reason });
    }

    // --- REST: Channel Permissions ---

    editPermissionOverwrite(
        channelId: Snowflake,
        overwriteId: Snowflake,
        data: { allow?: string; deny?: string; type: number },
        reason?: string,
    ): Promise<void> {
        return this.rest.put(`/channels/${channelId}/permissions/${overwriteId}`, { body: data, reason });
    }

    setPermissionOverwrite(channelId: Snowflake, overwriteId: Snowflake, data: PermissionOverwriteData, reason?: string): Promise<void> {
        return this.rest.put(`/channels/${channelId}/permissions/${overwriteId}`, { body: data, reason });
    }

    deletePermissionOverwrite(channelId: Snowflake, overwriteId: Snowflake, reason?: string): Promise<void> {
        return this.rest.delete(`/channels/${channelId}/permissions/${overwriteId}`, { reason });
    }

    // --- REST: Users ---

    fetchUser(userId: Snowflake): Promise<APIUser> {
        return this.rest.get<APIUser>(`/users/${userId}`);
    }

    fetchCurrentUser(): Promise<APIUser> {
        return this.rest.get<APIUser>(`/users/@me`);
    }

    editCurrentUser(data: { username?: string; avatar?: string | null }): Promise<APIUser> {
        return this.rest.patch<APIUser>(`/users/@me`, { body: data });
    }

    fetchCurrentUserGuilds(): Promise<Partial<APIGuild>[]> {
        return this.rest.get<Partial<APIGuild>[]>(`/users/@me/guilds`);
    }

    // --- REST: Members ---

    fetchMember(guildId: Snowflake, userId: Snowflake): Promise<APIGuildMember> {
        return this.rest.get<APIGuildMember>(`/guilds/${guildId}/members/${userId}`);
    }

    editMember(guildId: Snowflake, userId: Snowflake, data: EditMemberOptions, reason?: string): Promise<APIGuildMember> {
        return this.rest.patch<APIGuildMember>(`/guilds/${guildId}/members/${userId}`, { body: data, reason });
    }

    kickMember(guildId: Snowflake, userId: Snowflake, reason?: string): Promise<void> {
        return this.rest.delete(`/guilds/${guildId}/members/${userId}`, { reason });
    }

    banMember(guildId: Snowflake, userId: Snowflake, options: BanOptions = {}): Promise<void> {
        const body: Record<string, unknown> = {};
        if (options.delete_message_seconds !== undefined) body.delete_message_seconds = options.delete_message_seconds;
        return this.rest.put(`/guilds/${guildId}/bans/${userId}`, { body, reason: options.reason });
    }

    unbanMember(guildId: Snowflake, userId: Snowflake, reason?: string): Promise<void> {
        return this.rest.delete(`/guilds/${guildId}/bans/${userId}`, { reason });
    }

    listMembers(guildId: Snowflake, options: ListMembersOptions = {}): Promise<APIGuildMember[]> {
        const query: Record<string, string> = {};
        if (options.limit) query.limit = String(options.limit);
        if (options.after) query.after = options.after;
        return this.rest.get<APIGuildMember[]>(`/guilds/${guildId}/members`, { query });
    }

    pruneMembers(guildId: Snowflake, options: PruneMembersOptions = {}, reason?: string): Promise<PruneResult> {
        const body: Record<string, unknown> = {};
        if (options.days !== undefined) body.days = options.days;
        if (options.compute_prune_count !== undefined) body.compute_prune_count = options.compute_prune_count;
        if (options.include_roles !== undefined) body.include_roles = options.include_roles;
        return this.rest.post<PruneResult>(`/guilds/${guildId}/prune`, { body, reason });
    }

    getPruneCount(guildId: Snowflake, days?: number): Promise<PruneResult> {
        const query: Record<string, string> = {};
        if (days !== undefined) query.days = String(days);
        return this.rest.get<PruneResult>(`/guilds/${guildId}/prune`, { query });
    }

    // --- REST: Bans ---

    getBan(guildId: Snowflake, userId: Snowflake): Promise<GuildBan> {
        return this.rest.get<GuildBan>(`/guilds/${guildId}/bans/${userId}`);
    }

    getBans(guildId: Snowflake): Promise<GuildBan[]> {
        return this.rest.get<GuildBan[]>(`/guilds/${guildId}/bans`);
    }

    // --- REST: Audit Log ---

    getAuditLog(guildId: Snowflake, options: GetAuditLogOptions = {}): Promise<APIAuditLog> {
        const query: Record<string, string> = {};
        if (options.user_id) query.user_id = options.user_id;
        if (options.action_type !== undefined) query.action_type = String(options.action_type);
        if (options.before) query.before = options.before;
        if (options.after) query.after = options.after;
        if (options.limit) query.limit = String(options.limit);
        return this.rest.get<APIAuditLog>(`/guilds/${guildId}/audit-logs`, { query });
    }

    // --- REST: Invites ---

    getGuildInvites(guildId: Snowflake): Promise<APIInviteMetadata[]> {
        return this.rest.get<APIInviteMetadata[]>(`/guilds/${guildId}/invites`);
    }

    getChannelInvites(channelId: Snowflake): Promise<APIInviteMetadata[]> {
        return this.rest.get<APIInviteMetadata[]>(`/channels/${channelId}/invites`);
    }

    createInvite(channelId: Snowflake, options: CreateInviteOptions = {}, reason?: string): Promise<APIInvite> {
        return this.rest.post<APIInvite>(`/channels/${channelId}/invites`, { body: options, reason });
    }

    getInvite(code: string): Promise<APIInvite> {
        return this.rest.get<APIInvite>(`/invites/${code}`);
    }

    deleteInvite(code: string, reason?: string): Promise<APIInvite> {
        return this.rest.delete<APIInvite>(`/invites/${code}`, { reason });
    }

    // --- REST: Webhooks ---

    createWebhook(channelId: Snowflake, options: CreateWebhookOptions, reason?: string): Promise<APIWebhook> {
        return this.rest.post<APIWebhook>(`/channels/${channelId}/webhooks`, { body: options, reason });
    }

    getChannelWebhooks(channelId: Snowflake): Promise<APIWebhook[]> {
        return this.rest.get<APIWebhook[]>(`/channels/${channelId}/webhooks`);
    }

    getGuildWebhooks(guildId: Snowflake): Promise<APIWebhook[]> {
        return this.rest.get<APIWebhook[]>(`/guilds/${guildId}/webhooks`);
    }

    getWebhook(webhookId: Snowflake): Promise<APIWebhook> {
        return this.rest.get<APIWebhook>(`/webhooks/${webhookId}`);
    }

    editWebhook(webhookId: Snowflake, options: EditWebhookOptions, reason?: string): Promise<APIWebhook> {
        return this.rest.patch<APIWebhook>(`/webhooks/${webhookId}`, { body: options, reason });
    }

    deleteWebhook(webhookId: Snowflake, reason?: string): Promise<void> {
        return this.rest.delete(`/webhooks/${webhookId}`, { reason });
    }

    executeWebhook(webhookId: Snowflake, token: string, options: CreateMessageOptions): Promise<APIMessage | void> {
        const body: Record<string, unknown> = {};
        if (options.content !== undefined) body.content = options.content;
        if (options.embeds !== undefined) body.embeds = options.embeds;
        if (options.components !== undefined) body.components = options.components;
        if (options.tts !== undefined) body.tts = options.tts;
        if (options.allowed_mentions !== undefined) body.allowed_mentions = options.allowed_mentions;
        return this.rest.post(`/webhooks/${webhookId}/${token}`, { body, files: options.files });
    }

    // --- REST: Emojis ---

    getGuildEmojis(guildId: Snowflake): Promise<APIEmoji[]> {
        return this.rest.get<APIEmoji[]>(`/guilds/${guildId}/emojis`);
    }

    getGuildEmoji(guildId: Snowflake, emojiId: Snowflake): Promise<APIEmoji> {
        return this.rest.get<APIEmoji>(`/guilds/${guildId}/emojis/${emojiId}`);
    }

    createGuildEmoji(guildId: Snowflake, data: { name: string; image: string; roles?: Snowflake[] }, reason?: string): Promise<APIEmoji> {
        return this.rest.post<APIEmoji>(`/guilds/${guildId}/emojis`, { body: data, reason });
    }

    editGuildEmoji(guildId: Snowflake, emojiId: Snowflake, data: { name?: string; roles?: Snowflake[] | null }, reason?: string): Promise<APIEmoji> {
        return this.rest.patch<APIEmoji>(`/guilds/${guildId}/emojis/${emojiId}`, { body: data, reason });
    }

    deleteGuildEmoji(guildId: Snowflake, emojiId: Snowflake, reason?: string): Promise<void> {
        return this.rest.delete(`/guilds/${guildId}/emojis/${emojiId}`, { reason });
    }

    // --- REST: Stickers ---

    getGuildStickers(guildId: Snowflake): Promise<APISticker[]> {
        return this.rest.get<APISticker[]>(`/guilds/${guildId}/stickers`);
    }

    getGuildSticker(guildId: Snowflake, stickerId: Snowflake): Promise<APISticker> {
        return this.rest.get<APISticker>(`/guilds/${guildId}/stickers/${stickerId}`);
    }

    deleteGuildSticker(guildId: Snowflake, stickerId: Snowflake, reason?: string): Promise<void> {
        return this.rest.delete(`/guilds/${guildId}/stickers/${stickerId}`, { reason });
    }

    createGuildSticker(
        guildId: Snowflake,
        data: { name: string; description: string; tags: string; file: { name: string; data: Blob | Buffer } },
        reason?: string,
    ): Promise<APISticker> {
        return this.rest.post<APISticker>(`/guilds/${guildId}/stickers`, {
            body: { name: data.name, description: data.description, tags: data.tags },
            files: [data.file],
            reason,
        });
    }

    editGuildSticker(
        guildId: Snowflake,
        stickerId: Snowflake,
        data: { name?: string; description?: string | null; tags?: string },
        reason?: string,
    ): Promise<APISticker> {
        return this.rest.patch<APISticker>(`/guilds/${guildId}/stickers/${stickerId}`, { body: data, reason });
    }

    // --- REST: Scheduled Events ---

    getGuildScheduledEvents(guildId: Snowflake): Promise<APIGuildScheduledEvent[]> {
        return this.rest.get<APIGuildScheduledEvent[]>(`/guilds/${guildId}/scheduled-events`);
    }

    getGuildScheduledEvent(guildId: Snowflake, eventId: Snowflake): Promise<APIGuildScheduledEvent> {
        return this.rest.get<APIGuildScheduledEvent>(`/guilds/${guildId}/scheduled-events/${eventId}`);
    }

    createGuildScheduledEvent(guildId: Snowflake, data: Partial<APIGuildScheduledEvent>, reason?: string): Promise<APIGuildScheduledEvent> {
        return this.rest.post<APIGuildScheduledEvent>(`/guilds/${guildId}/scheduled-events`, { body: data, reason });
    }

    editGuildScheduledEvent(guildId: Snowflake, eventId: Snowflake, data: Partial<APIGuildScheduledEvent>, reason?: string): Promise<APIGuildScheduledEvent> {
        return this.rest.patch<APIGuildScheduledEvent>(`/guilds/${guildId}/scheduled-events/${eventId}`, { body: data, reason });
    }

    deleteGuildScheduledEvent(guildId: Snowflake, eventId: Snowflake): Promise<void> {
        return this.rest.delete(`/guilds/${guildId}/scheduled-events/${eventId}`);
    }

    // --- REST: Stage Instances ---

    createStageInstance(channelId: Snowflake, topic: string, reason?: string): Promise<APIStageInstance> {
        return this.rest.post<APIStageInstance>(`/stage-instances`, { body: { channel_id: channelId, topic }, reason });
    }

    getStageInstance(channelId: Snowflake): Promise<APIStageInstance> {
        return this.rest.get<APIStageInstance>(`/stage-instances/${channelId}`);
    }

    editStageInstance(channelId: Snowflake, topic: string, reason?: string): Promise<APIStageInstance> {
        return this.rest.patch<APIStageInstance>(`/stage-instances/${channelId}`, { body: { topic }, reason });
    }

    deleteStageInstance(channelId: Snowflake, reason?: string): Promise<void> {
        return this.rest.delete(`/stage-instances/${channelId}`, { reason });
    }

    // --- REST: Auto Moderation ---

    getAutoModerationRules(guildId: Snowflake): Promise<APIAutoModerationRule[]> {
        return this.rest.get<APIAutoModerationRule[]>(`/guilds/${guildId}/auto-moderation/rules`);
    }

    getAutoModerationRule(guildId: Snowflake, ruleId: Snowflake): Promise<APIAutoModerationRule> {
        return this.rest.get<APIAutoModerationRule>(`/guilds/${guildId}/auto-moderation/rules/${ruleId}`);
    }

    createAutoModerationRule(guildId: Snowflake, data: Partial<APIAutoModerationRule>, reason?: string): Promise<APIAutoModerationRule> {
        return this.rest.post<APIAutoModerationRule>(`/guilds/${guildId}/auto-moderation/rules`, { body: data, reason });
    }

    editAutoModerationRule(guildId: Snowflake, ruleId: Snowflake, data: Partial<APIAutoModerationRule>, reason?: string): Promise<APIAutoModerationRule> {
        return this.rest.patch<APIAutoModerationRule>(`/guilds/${guildId}/auto-moderation/rules/${ruleId}`, { body: data, reason });
    }

    deleteAutoModerationRule(guildId: Snowflake, ruleId: Snowflake, reason?: string): Promise<void> {
        return this.rest.delete(`/guilds/${guildId}/auto-moderation/rules/${ruleId}`, { reason });
    }

    // --- REST: Templates ---

    getGuildTemplates(guildId: Snowflake): Promise<APIGuildTemplate[]> {
        return this.rest.get<APIGuildTemplate[]>(`/guilds/${guildId}/templates`);
    }

    createGuildTemplate(guildId: Snowflake, data: { name: string; description?: string | null }): Promise<APIGuildTemplate> {
        return this.rest.post<APIGuildTemplate>(`/guilds/${guildId}/templates`, { body: data });
    }

    syncGuildTemplate(guildId: Snowflake, code: string): Promise<APIGuildTemplate> {
        return this.rest.put<APIGuildTemplate>(`/guilds/${guildId}/templates/${code}`);
    }

    editGuildTemplate(guildId: Snowflake, code: string, data: { name?: string; description?: string | null }): Promise<APIGuildTemplate> {
        return this.rest.patch<APIGuildTemplate>(`/guilds/${guildId}/templates/${code}`, { body: data });
    }

    deleteGuildTemplate(guildId: Snowflake, code: string): Promise<APIGuildTemplate> {
        return this.rest.delete<APIGuildTemplate>(`/guilds/${guildId}/templates/${code}`);
    }

    // --- REST: Threads ---

    getThreadMember(channelId: Snowflake, userId: Snowflake): Promise<APIThreadMember> {
        return this.rest.get<APIThreadMember>(`/channels/${channelId}/thread-members/${userId}`);
    }

    listThreadMembers(channelId: Snowflake): Promise<APIThreadMember[]> {
        return this.rest.get<APIThreadMember[]>(`/channels/${channelId}/thread-members`);
    }

    addThreadMember(channelId: Snowflake, userId: Snowflake): Promise<void> {
        return this.rest.put(`/channels/${channelId}/thread-members/${userId}`);
    }

    removeThreadMember(channelId: Snowflake, userId: Snowflake): Promise<void> {
        return this.rest.delete(`/channels/${channelId}/thread-members/${userId}`);
    }

    joinThread(channelId: Snowflake): Promise<void> {
        return this.rest.put(`/channels/${channelId}/thread-members/@me`);
    }

    leaveThread(channelId: Snowflake): Promise<void> {
        return this.rest.delete(`/channels/${channelId}/thread-members/@me`);
    }

    fetchActiveThreads(guildId: Snowflake): Promise<{ threads: APIChannel[]; members: APIThreadMember[] }> {
        return this.rest.get<{ threads: APIChannel[]; members: APIThreadMember[] }>(`/guilds/${guildId}/threads/active`);
    }

    // --- REST: DMs ---

    createDM(userId: Snowflake): Promise<APIChannel> {
        return this.rest.post<APIChannel>(`/users/@me/channels`, { body: { recipient_id: userId } });
    }

    // --- REST: Roles ---

    addRole(guildId: Snowflake, userId: Snowflake, roleId: Snowflake, reason?: string): Promise<void> {
        return this.rest.put(`/guilds/${guildId}/members/${userId}/roles/${roleId}`, { reason });
    }

    removeRole(guildId: Snowflake, userId: Snowflake, roleId: Snowflake, reason?: string): Promise<void> {
        return this.rest.delete(`/guilds/${guildId}/members/${userId}/roles/${roleId}`, { reason });
    }

    createRole(guildId: Snowflake, data: CreateRoleOptions = {}, reason?: string): Promise<APIRole> {
        return this.rest.post<APIRole>(`/guilds/${guildId}/roles`, { body: data, reason });
    }

    editRole(guildId: Snowflake, roleId: Snowflake, data: Partial<CreateRoleOptions>, reason?: string): Promise<APIRole> {
        return this.rest.patch<APIRole>(`/guilds/${guildId}/roles/${roleId}`, { body: data, reason });
    }

    deleteRole(guildId: Snowflake, roleId: Snowflake, reason?: string): Promise<void> {
        return this.rest.delete(`/guilds/${guildId}/roles/${roleId}`, { reason });
    }

    // --- REST: Reactions ---

    fetchReactions(channelId: Snowflake, messageId: Snowflake, emoji: string, options: { limit?: number; after?: Snowflake } = {}): Promise<APIUser[]> {
        const query: Record<string, string> = {};
        if (options.limit) query.limit = String(options.limit);
        if (options.after) query.after = options.after;
        return this.rest.get<APIUser[]>(`/channels/${channelId}/messages/${messageId}/reactions/${encodeURIComponent(emoji)}`, { query });
    }

    removeAllReactions(channelId: Snowflake, messageId: Snowflake): Promise<void> {
        return this.rest.delete(`/channels/${channelId}/messages/${messageId}/reactions`);
    }

    removeAllReactionsForEmoji(channelId: Snowflake, messageId: Snowflake, emoji: string): Promise<void> {
        return this.rest.delete(`/channels/${channelId}/messages/${messageId}/reactions/${encodeURIComponent(emoji)}`);
    }

    // --- REST: Typing ---

    triggerTyping(channelId: Snowflake): Promise<void> {
        return this.rest.post(`/channels/${channelId}/typing`);
    }

    // --- REST: Pins ---

    fetchPinnedMessages(channelId: Snowflake): Promise<APIMessage[]> {
        return this.rest.get<APIMessage[]>(`/channels/${channelId}/pins`);
    }

    // --- REST: Channels (additional) ---

    fetchGuildChannels(guildId: Snowflake): Promise<APIChannel[]> {
        return this.rest.get<APIChannel[]>(`/guilds/${guildId}/channels`);
    }

    fetchGuildRoles(guildId: Snowflake): Promise<APIRole[]> {
        return this.rest.get<APIRole[]>(`/guilds/${guildId}/roles`);
    }

    // --- REST: Threads (create) ---

    startThreadFromMessage(channelId: Snowflake, messageId: Snowflake, data: { name: string; auto_archive_duration?: number; rate_limit_per_user?: number }, reason?: string): Promise<APIChannel> {
        return this.rest.post<APIChannel>(`/channels/${channelId}/messages/${messageId}/threads`, { body: data, reason });
    }

    startThreadWithoutMessage(channelId: Snowflake, data: { name: string; type?: number; auto_archive_duration?: number; invitable?: boolean; rate_limit_per_user?: number }, reason?: string): Promise<APIChannel> {
        return this.rest.post<APIChannel>(`/channels/${channelId}/threads`, { body: data, reason });
    }

    // --- REST: Interactions ---

    respondInteraction(interactionId: Snowflake, token: string, response: InteractionResponseOptions): Promise<void> {
        const { files, ...body } = response;
        return this.rest.post(`/interactions/${interactionId}/${token}/callback`, { body, files });
    }

    respondAutocomplete(interactionId: Snowflake, token: string, choices: APIApplicationCommandOptionChoice[]): Promise<void> {
        return this.rest.post(`/interactions/${interactionId}/${token}/callback`, {
            body: {
                type: InteractionResponseType.ApplicationCommandAutocompleteResult,
                data: { choices },
            },
        });
    }

    editInteractionResponse(token: string, data: EditMessageOptions): Promise<APIMessage> {
        const appId = this.getAppId();
        return this.rest.patch<APIMessage>(`/webhooks/${appId}/${token}/messages/@original`, { body: data });
    }

    deleteInteractionResponse(token: string): Promise<void> {
        const appId = this.getAppId();
        return this.rest.delete(`/webhooks/${appId}/${token}/messages/@original`);
    }

    sendFollowup(token: string, options: CreateMessageOptions): Promise<APIMessage> {
        const appId = this.getAppId();
        const body: Record<string, unknown> = {};
        if (options.content !== undefined) body.content = options.content;
        if (options.embeds !== undefined) body.embeds = options.embeds;
        if (options.components !== undefined) body.components = options.components;
        if (options.flags !== undefined) body.flags = options.flags;
        if (options.tts !== undefined) body.tts = options.tts;
        if (options.allowed_mentions !== undefined) body.allowed_mentions = options.allowed_mentions;
        return this.rest.post<APIMessage>(`/webhooks/${appId}/${token}`, { body, files: options.files });
    }

    // --- REST: Application Commands ---

    getGlobalCommands(): Promise<APIApplicationCommand[]> {
        const appId = this.getAppId();
        return this.rest.get<APIApplicationCommand[]>(`/applications/${appId}/commands`);
    }

    createGlobalCommand(data: CreateApplicationCommandData): Promise<APIApplicationCommand> {
        const appId = this.getAppId();
        return this.rest.post<APIApplicationCommand>(`/applications/${appId}/commands`, { body: data });
    }

    setGlobalCommands(commands: CreateApplicationCommandData[]): Promise<APIApplicationCommand[]> {
        const appId = this.getAppId();
        return this.rest.put<APIApplicationCommand[]>(`/applications/${appId}/commands`, { body: commands });
    }

    editGlobalCommand(commandId: Snowflake, data: Partial<CreateApplicationCommandData>): Promise<APIApplicationCommand> {
        const appId = this.getAppId();
        return this.rest.patch<APIApplicationCommand>(`/applications/${appId}/commands/${commandId}`, { body: data });
    }

    deleteGlobalCommand(commandId: Snowflake): Promise<void> {
        const appId = this.getAppId();
        return this.rest.delete(`/applications/${appId}/commands/${commandId}`);
    }

    getGuildCommands(guildId: Snowflake): Promise<APIApplicationCommand[]> {
        const appId = this.getAppId();
        return this.rest.get<APIApplicationCommand[]>(`/applications/${appId}/guilds/${guildId}/commands`);
    }

    createGuildCommand(guildId: Snowflake, data: CreateApplicationCommandData): Promise<APIApplicationCommand> {
        const appId = this.getAppId();
        return this.rest.post<APIApplicationCommand>(`/applications/${appId}/guilds/${guildId}/commands`, { body: data });
    }

    setGuildCommands(guildId: Snowflake, commands: CreateApplicationCommandData[]): Promise<APIApplicationCommand[]> {
        const appId = this.getAppId();
        return this.rest.put<APIApplicationCommand[]>(`/applications/${appId}/guilds/${guildId}/commands`, { body: commands });
    }

    editGuildCommand(guildId: Snowflake, commandId: Snowflake, data: Partial<CreateApplicationCommandData>): Promise<APIApplicationCommand> {
        const appId = this.getAppId();
        return this.rest.patch<APIApplicationCommand>(`/applications/${appId}/guilds/${guildId}/commands/${commandId}`, { body: data });
    }

    deleteGuildCommand(guildId: Snowflake, commandId: Snowflake): Promise<void> {
        const appId = this.getAppId();
        return this.rest.delete(`/applications/${appId}/guilds/${guildId}/commands/${commandId}`);
    }

    // --- REST: Guild Widget & Vanity ---

    getGuildVanityUrl(guildId: Snowflake): Promise<GuildVanityUrl> {
        return this.rest.get<GuildVanityUrl>(`/guilds/${guildId}/vanity-url`);
    }

    getGuildWidgetSettings(guildId: Snowflake): Promise<GuildWidgetSettings> {
        return this.rest.get<GuildWidgetSettings>(`/guilds/${guildId}/widget`);
    }

    editGuildWidgetSettings(guildId: Snowflake, data: Partial<GuildWidgetSettings>, reason?: string): Promise<GuildWidgetSettings> {
        return this.rest.patch<GuildWidgetSettings>(`/guilds/${guildId}/widget`, { body: data, reason });
    }

    getGuildWidgetJson(guildId: Snowflake): Promise<unknown> {
        return this.rest.get(`/guilds/${guildId}/widget.json`);
    }

    // --- REST: Guild (additional) ---

    deleteGuild(guildId: Snowflake): Promise<void> {
        return this.rest.delete(`/guilds/${guildId}`);
    }

    fetchGuildPreview(guildId: Snowflake): Promise<unknown> {
        return this.rest.get(`/guilds/${guildId}/preview`);
    }

    setGuildMFALevel(guildId: Snowflake, level: number, reason?: string): Promise<void> {
        return this.rest.post(`/guilds/${guildId}/mfa`, { body: { level }, reason });
    }

    getGuildWelcomeScreen(guildId: Snowflake): Promise<unknown> {
        return this.rest.get(`/guilds/${guildId}/welcome-screen`);
    }

    editGuildWelcomeScreen(guildId: Snowflake, data: Record<string, unknown>, reason?: string): Promise<unknown> {
        return this.rest.patch(`/guilds/${guildId}/welcome-screen`, { body: data, reason });
    }

    getGuildOnboarding(guildId: Snowflake): Promise<unknown> {
        return this.rest.get(`/guilds/${guildId}/onboarding`);
    }

    editGuildOnboarding(guildId: Snowflake, data: Record<string, unknown>, reason?: string): Promise<unknown> {
        return this.rest.put(`/guilds/${guildId}/onboarding`, { body: data, reason });
    }

    searchGuildMembers(guildId: Snowflake, query: string, limit = 1): Promise<APIGuildMember[]> {
        return this.rest.get<APIGuildMember[]>(`/guilds/${guildId}/members/search`, {
            query: { query, limit: String(limit) },
        });
    }

    modifyGuildChannelPositions(guildId: Snowflake, positions: { id: Snowflake; position?: number | null; lock_permissions?: boolean | null; parent_id?: Snowflake | null }[]): Promise<void> {
        return this.rest.patch(`/guilds/${guildId}/channels`, { body: positions });
    }

    modifyGuildRolePositions(guildId: Snowflake, positions: { id: Snowflake; position?: number | null }[]): Promise<APIRole[]> {
        return this.rest.patch<APIRole[]>(`/guilds/${guildId}/roles`, { body: positions });
    }

    // --- REST: Voice Regions ---

    fetchVoiceRegions(): Promise<unknown[]> {
        return this.rest.get<unknown[]>(`/voice/regions`);
    }

    fetchGuildVoiceRegions(guildId: Snowflake): Promise<unknown[]> {
        return this.rest.get<unknown[]>(`/guilds/${guildId}/regions`);
    }

    // --- REST: Archived Threads ---

    fetchArchivedPublicThreads(channelId: Snowflake, options?: { before?: string; limit?: number }): Promise<{ threads: APIChannel[]; members: APIThreadMember[]; has_more: boolean }> {
        const query: Record<string, string> = {};
        if (options?.before) query.before = options.before;
        if (options?.limit) query.limit = String(options.limit);
        return this.rest.get(`/channels/${channelId}/threads/archived/public`, { query });
    }

    fetchArchivedPrivateThreads(channelId: Snowflake, options?: { before?: string; limit?: number }): Promise<{ threads: APIChannel[]; members: APIThreadMember[]; has_more: boolean }> {
        const query: Record<string, string> = {};
        if (options?.before) query.before = options.before;
        if (options?.limit) query.limit = String(options.limit);
        return this.rest.get(`/channels/${channelId}/threads/archived/private`, { query });
    }

    fetchJoinedPrivateArchivedThreads(channelId: Snowflake, options?: { before?: string; limit?: number }): Promise<{ threads: APIChannel[]; members: APIThreadMember[]; has_more: boolean }> {
        const query: Record<string, string> = {};
        if (options?.before) query.before = options.before;
        if (options?.limit) query.limit = String(options.limit);
        return this.rest.get(`/channels/${channelId}/users/@me/threads/archived/private`, { query });
    }

    // --- REST: Sticker Packs ---

    fetchStickerPacks(): Promise<{ sticker_packs: unknown[] }> {
        return this.rest.get(`/sticker-packs`);
    }

    fetchSticker(stickerId: Snowflake): Promise<APISticker> {
        return this.rest.get<APISticker>(`/stickers/${stickerId}`);
    }

    // --- REST: Application ---

    fetchApplication(): Promise<unknown> {
        return this.rest.get(`/applications/@me`);
    }

    // --- REST: Polls ---

    fetchPollAnswerVoters(channelId: Snowflake, messageId: Snowflake, answerId: number, options?: { after?: Snowflake; limit?: number }): Promise<{ users: APIUser[] }> {
        const query: Record<string, string> = {};
        if (options?.after) query.after = options.after;
        if (options?.limit) query.limit = String(options.limit);
        return this.rest.get(`/channels/${channelId}/polls/${messageId}/answers/${answerId}`, { query });
    }

    expirePoll(channelId: Snowflake, messageId: Snowflake): Promise<APIMessage> {
        return this.rest.post<APIMessage>(`/channels/${channelId}/polls/${messageId}/expire`);
    }

    // --- Invite generation ---

    /**
     * Generate an OAuth2 invite URL for the bot.
     * @param options.permissions Permission bitfield
     * @param options.scopes OAuth2 scopes (default: ["bot", "applications.commands"])
     * @param options.guildId Pre-select a guild
     * @param options.disableGuildSelect Prevent user from changing the pre-selected guild
     */
    generateInvite(options: {
        permissions?: bigint | number | string;
        scopes?: string[];
        guildId?: Snowflake;
        disableGuildSelect?: boolean;
    } = {}): string {
        const appId = this.getAppId();
        const scopes = options.scopes ?? ["bot", "applications.commands"];
        const params = new URLSearchParams({
            client_id: appId,
            scope: scopes.join(" "),
        });
        if (options.permissions !== undefined) params.set("permissions", String(options.permissions));
        if (options.guildId) params.set("guild_id", options.guildId);
        if (options.disableGuildSelect) params.set("disable_guild_select", "true");
        return `https://discord.com/oauth2/authorize?${params.toString()}`;
    }

    // --- Voice ---

    joinVoiceChannel(guildId: Snowflake, channelId: Snowflake, options?: { selfMute?: boolean; selfDeaf?: boolean }): VoiceConnection {
        let conn = this.voiceConnections.get(guildId);
        if (!conn) {
            conn = new VoiceConnection(
                guildId,
                this.getAppId(),
                (g, c, m, d) => {
                    if (this.shardManager) {
                        this.shardManager.sendVoiceStateUpdate(g, c, m, d);
                    } else {
                        this.gateway!.sendVoiceStateUpdate(g, c, m, d);
                    }
                },
            );
            this.voiceConnections.set(guildId, conn);
        }
        conn.joinChannel(channelId, options?.selfMute, options?.selfDeaf);
        return conn;
    }

    leaveVoiceChannel(guildId: Snowflake): void {
        const conn = this.voiceConnections.get(guildId);
        if (conn) {
            conn.leaveChannel();
            this.voiceConnections.delete(guildId);
        }
    }

    getVoiceConnection(guildId: Snowflake): VoiceConnection | undefined {
        return this.voiceConnections.get(guildId);
    }

    /**
     * Send OP4 Voice State Update without creating a VoiceConnection.
     * Used by Lavalink and other external voice libraries.
     */
    sendVoiceUpdate(guildId: Snowflake, channelId: Snowflake | null, selfMute = false, selfDeaf = false): void {
        if (this.shardManager) {
            this.shardManager.sendVoiceStateUpdate(guildId, channelId, selfMute, selfDeaf);
        } else {
            this.gateway!.sendVoiceStateUpdate(guildId, channelId, selfMute, selfDeaf);
        }
    }

    /**
     * Get the bot user ID. Returns null before READY.
     */
    getUserId(): Snowflake | null {
        return this.user?.id ?? null;
    }

    // --- Gateway: Request Guild Members (OP8) ---

    requestGuildMembers(guildId: Snowflake, options: RequestGuildMembersOptions = {}): void {
        const payload: Record<string, unknown> = { guild_id: guildId };
        if (options.query !== undefined) payload.query = options.query;
        if (options.limit !== undefined) payload.limit = options.limit;
        if (options.presences !== undefined) payload.presences = options.presences;
        if (options.user_ids !== undefined) payload.user_ids = options.user_ids;
        if (options.nonce !== undefined) payload.nonce = options.nonce;

        if (this.shardManager) {
            this.shardManager.requestGuildMembers(guildId, payload);
        } else {
            this.gateway!.requestGuildMembers(payload);
        }
    }

    /**
     * Request guild members via gateway and wait for all chunks to arrive.
     * Returns the guild's member collection once all chunks have been cached.
     */
    fetchMembers(guildId: Snowflake, options: FetchMembersOptions = {}): Promise<Collection<Snowflake, GuildMember>> {
        const timeoutMs = options.timeout ?? 120_000;
        const nonce = `fm_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

        return new Promise<Collection<Snowflake, GuildMember>>((resolve, reject) => {
            const timer = setTimeout(() => {
                cleanup();
                reject(new Error(`fetchMembers timed out for guild ${guildId}`));
            }, timeoutMs);

            let received = 0;

            const handler = (data: GatewayGuildMembersChunkData) => {
                if (data.nonce !== nonce || data.guild_id !== guildId) return;
                received++;
                if (received >= data.chunk_count) {
                    cleanup();
                    const guild = this.guilds.get(guildId);
                    resolve(guild?.members ?? new Collection());
                }
            };

            const cleanup = () => {
                clearTimeout(timer);
                this.off("GUILD_MEMBERS_CHUNK", handler as never);
            };

            this.on("GUILD_MEMBERS_CHUNK", handler as never);

            this.requestGuildMembers(guildId, {
                query: options.query ?? "",
                limit: options.limit ?? 0,
                presences: options.presences,
                user_ids: options.user_ids,
                nonce,
            });
        });
    }

    // --- Presence ---

    setPresence(presence: GatewayPresence): void {
        if (this.gateway) {
            this.gateway.setPresence(presence);
        } else if (this.shardManager) {
            this.shardManager.setPresence(presence);
        }
    }

    // --- Collectors ---

    createMessageCollector(channelId: Snowflake, options?: CollectorOptions): MessageCollector {
        const collector = new MessageCollector(channelId, options);
        this.on("MESSAGE_CREATE", collector.handler as never);
        collector.on("end", () => {
            this.off("MESSAGE_CREATE", collector.handler as never);
        });
        return collector;
    }

    awaitMessages(channelId: Snowflake, options?: CollectorOptions): Promise<Collection<Snowflake, Message>> {
        return new Promise((resolve) => {
            const collector = this.createMessageCollector(channelId, options);
            collector.on("end", (collected: Collection<Snowflake, Message>) => resolve(collected));
        });
    }

    createComponentCollector(messageId: Snowflake, options?: ComponentCollectorOptions): ComponentCollector {
        const collector = new ComponentCollector(messageId, options);
        this.on("INTERACTION_CREATE", collector.handler as never);
        collector.on("end", () => {
            this.off("INTERACTION_CREATE", collector.handler as never);
        });
        return collector;
    }

    awaitComponents(messageId: Snowflake, options?: ComponentCollectorOptions): Promise<Collection<Snowflake, unknown>> {
        return new Promise((resolve) => {
            const collector = this.createComponentCollector(messageId, options);
            collector.on("end", (collected: Collection<Snowflake, unknown>) => resolve(collected));
        });
    }

    createReactionCollector(messageId: Snowflake, options?: ReactionCollectorOptions): ReactionCollector {
        const collector = new ReactionCollector(messageId, options);
        this.on("MESSAGE_REACTION_ADD", collector.handler as never);
        collector.on("end", () => {
            this.off("MESSAGE_REACTION_ADD", collector.handler as never);
        });
        return collector;
    }

    awaitReactions(messageId: Snowflake, options?: ReactionCollectorOptions): Promise<Collection<string, GatewayMessageReactionAddData>> {
        return new Promise((resolve) => {
            const collector = this.createReactionCollector(messageId, options);
            collector.on("end", (collected: Collection<string, GatewayMessageReactionAddData>) => resolve(collected));
        });
    }

    /**
     * Wait for a modal submission matching the given customId.
     * Returns the ModalSubmit interaction or rejects on timeout.
     */
    awaitModalSubmit(options: { filter?: (interaction: unknown) => boolean; time: number }): Promise<unknown> {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                cleanup();
                reject(new Error("Modal submit timed out"));
            }, options.time);

            const handler = (interaction: unknown) => {
                const i = interaction as { type: number; isModalSubmit?: () => boolean };
                if (i.type !== 5) return; // ModalSubmit type
                if (options.filter && !options.filter(interaction)) return;
                cleanup();
                resolve(interaction);
            };

            const cleanup = () => {
                clearTimeout(timer);
                this.off("INTERACTION_CREATE", handler as never);
            };

            this.on("INTERACTION_CREATE", handler as never);
        });
    }

    // --- Event Streams ---

    /**
     * Returns an async iterator that yields events as they arrive.
     * Stops when the optional AbortSignal is triggered.
     *
     * @example
     * ```ts
     * for await (const msg of client.stream("MESSAGE_CREATE", { signal })) {
     *     console.log(msg.content);
     * }
     * ```
     */
    async *stream<K extends keyof ClientEvents & string>(
        event: K,
        options?: { signal?: AbortSignal },
    ): AsyncGenerator<ClientEvents[K], void, undefined> {
        const queue: ClientEvents[K][] = [];
        let resolve: (() => void) | null = null;
        let done = false;

        const handler = (data: ClientEvents[K]) => {
            queue.push(data);
            resolve?.();
        };

        const onAbort = () => {
            done = true;
            resolve?.();
        };

        this.on(event, handler as never);
        options?.signal?.addEventListener("abort", onAbort, { once: true });

        try {
            while (!done) {
                if (queue.length > 0) {
                    yield queue.shift()!;
                } else {
                    await new Promise<void>(r => { resolve = r; });
                    resolve = null;
                }
            }
            while (queue.length > 0) yield queue.shift()!;
        } finally {
            this.off(event, handler as never);
            options?.signal?.removeEventListener("abort", onAbort);
        }
    }

    // --- Interaction Routing ---

    /** Register a slash command handler. Use `"name/sub"` or `"name/group/sub"` for subcommands. */
    command(name: string, handler: (interaction: ChatInputInteraction) => void | Promise<void>): this {
        this.commandHandlers.set(name, handler);
        return this;
    }

    /** Register an autocomplete handler. Supports the same `"name/sub"` syntax. */
    autocomplete(name: string, handler: (interaction: AutocompleteInteraction) => void | Promise<void>): this {
        this.autocompleteHandlers.set(name, handler);
        return this;
    }

    /** Register a context menu command handler (user or message). */
    contextMenu(name: string, handler: (interaction: ContextMenuInteraction) => void | Promise<void>): this {
        this.contextMenuHandlers.set(name, handler);
        return this;
    }

    /** Register a button handler. Accepts exact string or RegExp for custom_id matching. */
    button(match: string | RegExp, handler: (interaction: ButtonInteraction) => void | Promise<void>): this {
        this.buttonHandlers.push({ match, handler });
        return this;
    }

    /** Register a select menu handler. Accepts exact string or RegExp for custom_id matching. */
    selectMenu(match: string | RegExp, handler: (interaction: SelectMenuInteraction) => void | Promise<void>): this {
        this.selectMenuHandlers.push({ match, handler });
        return this;
    }

    /** Register a modal submit handler. Accepts exact string or RegExp for custom_id matching. */
    modal(match: string | RegExp, handler: (interaction: ModalSubmitInteraction) => void | Promise<void>): this {
        this.modalHandlers.push({ match, handler });
        return this;
    }

    private routeInteraction(interaction: Interaction): void {
        if (interaction.isChatInputCommand()) {
            const handler = this.resolveCommandHandler(interaction.commandName, interaction.options, this.commandHandlers);
            if (handler) handler(interaction);
        } else if (interaction.isContextMenuCommand()) {
            this.contextMenuHandlers.get(interaction.commandName)?.(interaction);
        } else if (interaction.isAutocomplete()) {
            const handler = this.resolveCommandHandler(interaction.commandName, interaction.options, this.autocompleteHandlers);
            if (handler) handler(interaction);
        } else if (interaction.isButton()) {
            this.matchComponent(interaction.customId, this.buttonHandlers, interaction);
        } else if (interaction.isSelectMenu()) {
            this.matchComponent(interaction.customId, this.selectMenuHandlers, interaction);
        } else if (interaction.isModalSubmit()) {
            this.matchComponent(interaction.customId, this.modalHandlers, interaction);
        }
    }

    private resolveCommandHandler<T>(
        name: string,
        options: { getSubcommand(): string | null; getSubcommandGroup(): string | null },
        handlers: Map<string, T>,
    ): T | undefined {
        const sub = options.getSubcommand();
        const group = options.getSubcommandGroup();
        let key = name;
        if (group && sub) key = `${name}/${group}/${sub}`;
        else if (sub) key = `${name}/${sub}`;
        return handlers.get(key) ?? handlers.get(name);
    }

    private matchComponent<T>(customId: string, entries: ComponentEntry<T>[], interaction: T): void {
        for (const { match, handler } of entries) {
            if (typeof match === "string" ? customId === match : match.test(customId)) {
                handler(interaction);
                return;
            }
        }
    }

    // --- Helpers ---

    /** Returns the application/bot user ID. Throws if called before READY. */
    private getAppId(): Snowflake {
        const id = this.user?.id;
        if (!id) throw new Error("Client is not ready - user ID unavailable. Wait for the 'ready' event.");
        return id;
    }

    // --- Internal ---

    private setupListeners(): void {
        const source = this.shardManager ?? this.gateway!;

        // Events that emit entities instead of raw data
        const entityEvents = new Set([
            "MESSAGE_CREATE", "MESSAGE_UPDATE",
            "INTERACTION_CREATE",
            "GUILD_CREATE",
            "GUILD_MEMBER_ADD",
        ]);

        const validated = new Set<string>();
        for (const event of Object.values(GatewayEvent)) {
            if (entityEvents.has(event)) continue; // handled below
            source.on(event, (data: unknown) => {
                if (!validated.has(event)) {
                    validated.add(event);
                    validateIntentsForEvent(this.options.intents, event);
                }
                this.emit(event, data);
            });
        }

        // Emit Message entity for MESSAGE_CREATE
        source.on("MESSAGE_CREATE", (raw: APIMessage) => {
            const cached = this.cache.getMessage(raw.channel_id, raw.id);
            const message = cached ?? new Message(this, raw);
            this.emit("MESSAGE_CREATE", message as never);
        });

        // Emit Message entity for MESSAGE_UPDATE
        // Note: CacheManager creates a partial entity if the message wasn't cached
        // (out-of-order events), so getMessage() always returns after cache processes it.
        source.on("MESSAGE_UPDATE", (raw: Partial<APIMessage> & { id: Snowflake; channel_id: Snowflake }) => {
            const cached = this.cache.getMessage(raw.channel_id, raw.id);
            if (cached) {
                this.emit("MESSAGE_UPDATE", cached as never);
            }
        });

        // Emit Interaction entity for INTERACTION_CREATE and route to handlers
        source.on("INTERACTION_CREATE", (raw: APIInteraction) => {
            const interaction = this.cache.factory.createInteraction(raw);
            this.emit("INTERACTION_CREATE", interaction as never);
            this.routeInteraction(interaction);
        });

        // Emit Guild entity for GUILD_CREATE
        source.on("GUILD_CREATE", (raw: GatewayGuild) => {
            const guild = this.guilds.get(raw.id);
            if (guild) {
                this.emit("GUILD_CREATE", guild as never);
            }
        });

        // Emit GuildMember entity for GUILD_MEMBER_ADD
        source.on("GUILD_MEMBER_ADD", (raw: GatewayGuildMemberAddData) => {
            const guild = this.guilds.get(raw.guild_id);
            const member = guild?.members.get(raw.user?.id ?? "");
            if (member) {
                this.emit("GUILD_MEMBER_ADD", member as never);
            }
        });

        // Route voice events to VoiceConnection instances
        source.on("VOICE_STATE_UPDATE", (state: unknown) => {
            const voiceState = state as APIVoiceState;
            if (voiceState.user_id === this.user?.id && voiceState.guild_id) {
                const conn = this.voiceConnections.get(voiceState.guild_id);
                conn?.handleVoiceStateUpdate(voiceState);
            }
        });

        source.on("VOICE_SERVER_UPDATE", (data: unknown) => {
            const serverData = data as GatewayVoiceServerUpdateData;
            const conn = this.voiceConnections.get(serverData.guild_id);
            conn?.handleVoiceServerUpdate(serverData);
        });

        source.on("error", (err: Error) => {
            this.emit("error", err);
        });
    }
}
