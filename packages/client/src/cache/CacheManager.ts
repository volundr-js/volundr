import { Logger } from "@volundr/logger";
import type { TypedEmitter, GatewayEvents } from "@volundr/types";
import type {
    Snowflake,
    APIGuild,
    APIChannel,
    APIUser,
    APIMessage,
    APIVoiceState,
    APIPresenceUpdate,
    GatewayGuild,
    GatewayReadyData,
    GatewayGuildMemberAddData,
    GatewayGuildMemberRemoveData,
    GatewayGuildMemberUpdateData,
    GatewayGuildMembersChunkData,
    GatewayGuildRoleData,
    GatewayGuildRoleDeleteData,
    GatewayGuildEmojisUpdateData,
    GatewayMessageDeleteData,
    GatewayMessageDeleteBulkData,
    APIUnavailableGuild,
    GatewayThreadListSyncData,
} from "@volundr/types";
import { Collection } from "../collection/Collection.js";
import { EntityFactory } from "../entities/EntityFactory.js";
import type { Guild } from "../entities/Guild.js";
import type { Channel } from "../entities/channels/index.js";
import type { User } from "../entities/User.js";
import { Message } from "../entities/Message.js";
import type { Client } from "../Client.js";

const log = Logger.getLogger("client", "Cache");

const DEFAULT_MESSAGE_LIMIT = 100;

export class CacheManager {
    readonly factory: EntityFactory;
    readonly messages = new Collection<Snowflake, Collection<Snowflake, Message>>();

    private readonly client: Client;
    private readonly messageLimit: number;

    constructor(client: Client, source: TypedEmitter<GatewayEvents>, messageLimit = DEFAULT_MESSAGE_LIMIT) {
        this.client = client;
        this.factory = new EntityFactory(client);
        this.messageLimit = messageLimit;
        this.bind(source);
    }

    // --- Helpers ---

    getMessage(channelId: Snowflake, messageId: Snowflake): Message | undefined {
        return this.messages.get(channelId)?.get(messageId);
    }

    clear(): void {
        this.client.guilds.clear();
        this.client.channels.clear();
        this.client.users.clear();
        this.messages.clear();
    }

    // --- Internal ---

    private bind(source: TypedEmitter<GatewayEvents>): void {
        source.on("READY", (data: GatewayReadyData) => this.onReady(data));

        source.on("GUILD_CREATE", (guild: GatewayGuild) => this.onGuildCreate(guild));
        source.on("GUILD_UPDATE", (guild: APIGuild) => this.onGuildUpdate(guild));
        source.on("GUILD_DELETE", (guild: APIUnavailableGuild) => this.onGuildDelete(guild));

        source.on("CHANNEL_CREATE", (ch: APIChannel) => this.factory.createChannel(ch));
        source.on("CHANNEL_UPDATE", (ch: APIChannel) => this.factory.createChannel(ch));
        source.on("CHANNEL_DELETE", (ch: APIChannel) => this.onChannelDelete(ch));

        source.on("GUILD_MEMBER_ADD", (data: GatewayGuildMemberAddData) => this.onMemberAdd(data));
        source.on("GUILD_MEMBER_REMOVE", (data: GatewayGuildMemberRemoveData) => this.onMemberRemove(data));
        source.on("GUILD_MEMBER_UPDATE", (data: GatewayGuildMemberUpdateData) => this.onMemberUpdate(data));
        source.on("GUILD_MEMBERS_CHUNK", (data: GatewayGuildMembersChunkData) => this.onMembersChunk(data));

        source.on("GUILD_ROLE_CREATE", (data: GatewayGuildRoleData) => {
            this.factory.createRole(data.role, data.guild_id);
        });
        source.on("GUILD_ROLE_UPDATE", (data: GatewayGuildRoleData) => {
            this.factory.createRole(data.role, data.guild_id);
        });
        source.on("GUILD_ROLE_DELETE", (data: GatewayGuildRoleDeleteData) => {
            this.client.guilds.get(data.guild_id)?.roles.delete(data.role_id);
        });

        source.on("GUILD_EMOJIS_UPDATE", (_data: GatewayGuildEmojisUpdateData) => {
            // GuildEmoji entities will be handled in a future iteration
        });

        source.on("MESSAGE_CREATE", (msg: APIMessage) => this.onMessageCreate(msg));
        source.on("MESSAGE_UPDATE", (msg) => this.onMessageUpdate(msg));
        source.on("MESSAGE_DELETE", (data: GatewayMessageDeleteData) => {
            this.messages.get(data.channel_id)?.delete(data.id);
        });
        source.on("MESSAGE_DELETE_BULK", (data: GatewayMessageDeleteBulkData) => {
            const store = this.messages.get(data.channel_id);
            if (store) {
                for (const id of data.ids) store.delete(id);
            }
        });

        source.on("USER_UPDATE", (user: APIUser) => this.factory.createUser(user));

        source.on("VOICE_STATE_UPDATE", (state: APIVoiceState) => this.onVoiceStateUpdate(state));

        source.on("PRESENCE_UPDATE", (presence: APIPresenceUpdate) => {
            // Early bailout: skip patch if status and activities unchanged
            const guild = this.client.guilds.get(presence.guild_id);
            const existing = guild?.presences.get(presence.user.id);
            if (existing
                && existing.status === presence.status
                && existing.activities.length === presence.activities.length) {
                return;
            }
            this.factory.createPresence(presence);
        });

        // Thread events
        source.on("THREAD_CREATE", (ch: APIChannel) => this.factory.createChannel(ch));
        source.on("THREAD_UPDATE", (ch: APIChannel) => this.factory.createChannel(ch));
        source.on("THREAD_DELETE", (ch: APIChannel) => this.onChannelDelete(ch));
        source.on("THREAD_LIST_SYNC", (data: GatewayThreadListSyncData) => {
            for (const thread of data.threads) this.factory.createChannel(thread);
        });
    }

    private onReady(data: GatewayReadyData): void {
        this.clear();
        this.factory.createUser(data.user);
        log.info(`Cache initialized (${data.guilds.length} guilds pending)`);
    }

    private onGuildCreate(guild: GatewayGuild): void {
        this.factory.createGuild(guild);

        const guildEntity = this.client.guilds.get(guild.id);
        if (guildEntity) {
            // Populate voice states
            if (guild.voice_states) {
                for (const vs of guild.voice_states) {
                    vs.guild_id = guild.id;
                    this.factory.createVoiceState(vs);
                }
            }

            // Populate presences
            if (guild.presences) {
                for (const pres of guild.presences) {
                    this.factory.createPresence(pres);
                }
            }
        }

        log.debug(() => `Cached guild ${guild.name} (${guild.members?.length ?? 0} members, ${guild.channels?.length ?? 0} channels)`);
    }

    private onGuildUpdate(guild: APIGuild): void {
        const existing = this.client.guilds.get(guild.id);
        if (existing) {
            existing._patch(guild);
        } else {
            this.factory.createGuild(guild as GatewayGuild);
        }
    }

    private onGuildDelete(guild: APIUnavailableGuild): void {
        const existing = this.client.guilds.get(guild.id);
        if (existing) {
            for (const [id] of existing.channels) {
                this.client.channels.delete(id);
            }
        }
        this.client.guilds.delete(guild.id);
        log.debug(() => `Removed guild ${guild.id} from cache`);
    }

    private onChannelDelete(ch: APIChannel): void {
        this.client.channels.delete(ch.id);
        if (ch.guild_id) {
            this.client.guilds.get(ch.guild_id)?.channels.delete(ch.id);
        }
    }

    private onMemberAdd(data: GatewayGuildMemberAddData): void {
        const { guild_id, ...member } = data;
        if (member.user) {
            this.factory.createMember(member, guild_id);
        }
        const guild = this.client.guilds.get(guild_id);
        if (guild) guild.memberCount++;
    }

    private onMemberRemove(data: GatewayGuildMemberRemoveData): void {
        const guild = this.client.guilds.get(data.guild_id);
        if (guild) {
            guild.members.delete(data.user.id);
            guild.memberCount--;
        }
    }

    private onMemberUpdate(data: GatewayGuildMemberUpdateData): void {
        const memberData = {
            user: data.user,
            roles: data.roles,
            nick: data.nick,
            avatar: data.avatar,
            joined_at: data.joined_at ?? "",
            premium_since: data.premium_since,
            pending: data.pending,
            communication_disabled_until: data.communication_disabled_until,
            deaf: data.deaf ?? false,
            mute: data.mute ?? false,
            flags: data.flags ?? 0,
        };
        this.factory.createMember(memberData, data.guild_id);
    }

    private onMembersChunk(data: GatewayGuildMembersChunkData): void {
        for (const member of data.members) {
            if (member.user) {
                this.factory.createMember(member, data.guild_id);
            }
        }

        if (data.presences) {
            for (const pres of data.presences) {
                this.factory.createPresence(pres);
            }
        }

        log.debug(() => `Chunk ${data.chunk_index + 1}/${data.chunk_count} for guild ${data.guild_id} (${data.members.length} members)`);
    }

    private onMessageCreate(msg: APIMessage): void {
        const message = this.factory.createMessage(msg);

        let store = this.messages.get(msg.channel_id);
        if (!store) {
            store = new Collection<Snowflake, Message>();
            this.messages.set(msg.channel_id, store);
        }
        store.set(msg.id, message);

        // Enforce limit
        if (store.size > this.messageLimit) {
            const oldest = store.keys().next().value;
            if (oldest !== undefined) store.delete(oldest);
        }
    }

    private onMessageUpdate(msg: Partial<APIMessage> & { id: Snowflake; channel_id: Snowflake }): void {
        let store = this.messages.get(msg.channel_id);
        const existing = store?.get(msg.id);

        if (existing) {
            existing._patch(msg);
        } else {
            // Out-of-order: UPDATE arrived before CREATE - create partial entity
            const message = this.factory.createMessage(msg as APIMessage);
            if (!store) {
                store = new Collection<Snowflake, Message>();
                this.messages.set(msg.channel_id, store);
            }
            store.set(msg.id, message);
        }
    }

    private onVoiceStateUpdate(state: APIVoiceState): void {
        if (!state.guild_id) return;

        const guild = this.client.guilds.get(state.guild_id);
        if (!guild) return;

        if (state.channel_id === null) {
            guild.voiceStates.delete(state.user_id);
        } else {
            this.factory.createVoiceState(state);
        }
    }
}
