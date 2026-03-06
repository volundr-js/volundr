import type {
    APIGuild, GatewayGuild, APIRole, APIGuildMember, APIChannel,
    APIEmoji, APIInviteMetadata, APIAuditLog, APIWebhook, Snowflake,
} from "@volundr/types";
import { BaseEntity } from "./Base.js";
import { Collection } from "../collection/Collection.js";
import { CDN } from "../cdn/CDN.js";
import type { Client } from "../Client.js";
import type { ImageURLOptions } from "./User.js";
import { Role, type EditRoleOptions } from "./Role.js";
import { GuildMember } from "./GuildMember.js";
import { User } from "./User.js";
import { channelFrom, type Channel, GuildChannel } from "./channels/index.js";
import type { VoiceState } from "./VoiceState.js";
import type { Presence } from "./Presence.js";
import type { VoiceConnection } from "@volundr/gateway";
import type { CreateChannelOptions, ListMembersOptions, GetAuditLogOptions, GuildBan } from "../types.js";

export interface EditGuildOptions {
    name?: string;
    icon?: string | null;
    banner?: string | null;
    splash?: string | null;
    afk_channel_id?: Snowflake | null;
    afk_timeout?: number;
    verification_level?: number;
    default_message_notifications?: number;
    explicit_content_filter?: number;
    system_channel_id?: Snowflake | null;
    rules_channel_id?: Snowflake | null;
}

export class Guild extends BaseEntity {
    name!: string;
    icon!: string | null;
    splash!: string | null;
    discoverySplash!: string | null;
    banner!: string | null;
    ownerId!: Snowflake;
    afkChannelId!: Snowflake | null;
    afkTimeout!: number;
    verificationLevel!: number;
    defaultMessageNotifications!: number;
    explicitContentFilter!: number;
    mfaLevel!: number;
    systemChannelId!: Snowflake | null;
    systemChannelFlags!: number;
    rulesChannelId!: Snowflake | null;
    vanityURLCode!: string | null;
    description!: string | null;
    premiumTier!: number;
    premiumSubscriptionCount!: number;
    preferredLocale!: string;
    nsfwLevel!: number;
    features!: string[];
    large!: boolean;
    unavailable!: boolean;
    memberCount!: number;
    premiumProgressBarEnabled!: boolean;
    safetyAlertsChannelId!: Snowflake | null;

    /** Guild-scoped collections */
    channels = new Collection<Snowflake, GuildChannel>();
    members = new Collection<Snowflake, GuildMember>();
    roles = new Collection<Snowflake, Role>();
    voiceStates = new Collection<Snowflake, VoiceState>();
    presences = new Collection<Snowflake, Presence>();

    constructor(client: Client, data: APIGuild | GatewayGuild) {
        super(client, data.id);
        this._patch(data);
    }

    _patch(data: Partial<APIGuild> | Partial<GatewayGuild>): void {
        if (data.name !== undefined) this.name = data.name!;
        if (data.icon !== undefined) this.icon = data.icon ?? null;
        if (data.splash !== undefined) this.splash = data.splash ?? null;
        if (data.discovery_splash !== undefined) this.discoverySplash = data.discovery_splash ?? null;
        else if (this.discoverySplash === undefined) this.discoverySplash = null;
        if (data.banner !== undefined) this.banner = data.banner ?? null;
        if (data.owner_id !== undefined) this.ownerId = data.owner_id;
        if (data.afk_channel_id !== undefined) this.afkChannelId = data.afk_channel_id ?? null;
        if (data.afk_timeout !== undefined) this.afkTimeout = data.afk_timeout;
        if (data.verification_level !== undefined) this.verificationLevel = data.verification_level;
        if (data.default_message_notifications !== undefined) this.defaultMessageNotifications = data.default_message_notifications;
        if (data.explicit_content_filter !== undefined) this.explicitContentFilter = data.explicit_content_filter;
        if (data.mfa_level !== undefined) this.mfaLevel = data.mfa_level;
        if (data.system_channel_id !== undefined) this.systemChannelId = data.system_channel_id ?? null;
        if (data.system_channel_flags !== undefined) this.systemChannelFlags = data.system_channel_flags;
        if (data.rules_channel_id !== undefined) this.rulesChannelId = data.rules_channel_id ?? null;
        if (data.vanity_url_code !== undefined) this.vanityURLCode = data.vanity_url_code ?? null;
        if (data.description !== undefined) this.description = data.description ?? null;
        if (data.premium_tier !== undefined) this.premiumTier = data.premium_tier;
        if (data.premium_subscription_count !== undefined) this.premiumSubscriptionCount = data.premium_subscription_count;
        else if (this.premiumSubscriptionCount === undefined) this.premiumSubscriptionCount = 0;
        if (data.preferred_locale !== undefined) this.preferredLocale = data.preferred_locale;
        if (data.nsfw_level !== undefined) this.nsfwLevel = data.nsfw_level;
        if (data.features !== undefined) this.features = data.features;
        if (data.premium_progress_bar_enabled !== undefined) this.premiumProgressBarEnabled = data.premium_progress_bar_enabled;
        if (data.safety_alerts_channel_id !== undefined) this.safetyAlertsChannelId = data.safety_alerts_channel_id ?? null;
        else if (this.safetyAlertsChannelId === undefined) this.safetyAlertsChannelId = null;

        // GatewayGuild-specific fields
        const gw = data as Partial<GatewayGuild>;
        if (gw.large !== undefined) this.large = gw.large;
        else if (this.large === undefined) this.large = false;
        if (gw.unavailable !== undefined) this.unavailable = gw.unavailable!;
        else if (this.unavailable === undefined) this.unavailable = false;
        if (gw.member_count !== undefined) this.memberCount = gw.member_count;
        else if (this.memberCount === undefined) this.memberCount = 0;

        // Populate roles - upsert existing, remove deleted
        if (data.roles) {
            const seen = new Set<string>();
            for (const r of data.roles) {
                seen.add(r.id);
                const existing = this.roles.get(r.id);
                if (existing) {
                    existing._patch(r);
                } else {
                    this.roles.set(r.id, new Role(this.client, r, this.id));
                }
            }
            for (const id of this.roles.keys()) {
                if (!seen.has(id)) this.roles.delete(id);
            }
        }

        // Populate channels (GatewayGuild only) - also register in flat client.channels
        if (gw.channels) {
            this.channels.clear();
            for (const ch of gw.channels) {
                ch.guild_id = this.id;
                const channel = channelFrom(this.client, ch);
                if (channel instanceof GuildChannel) {
                    this.channels.set(ch.id, channel);
                    this.client.channels.set(ch.id, channel);
                }
            }
            if (gw.threads) {
                for (const th of gw.threads) {
                    th.guild_id = this.id;
                    const channel = channelFrom(this.client, th);
                    if (channel instanceof GuildChannel) {
                        this.channels.set(th.id, channel);
                        this.client.channels.set(th.id, channel);
                    }
                }
            }
        }

        // Populate members (GatewayGuild only) - also register users in client.users
        if (gw.members) {
            this.members.clear();
            for (const m of gw.members) {
                if (!m.user) continue;
                // Reuse existing user entity or create a new one
                let user = this.client.users.get(m.user.id);
                if (user) {
                    user._patch(m.user);
                } else {
                    user = new User(this.client, m.user);
                    this.client.users.set(m.user.id, user);
                }

                const member = new GuildMember(this.client, m, this.id, m.user.id);
                member.user = user;
                this.members.set(m.user.id, member);
            }
        }
    }

    /** The bot's own member in this guild. */
    get me(): GuildMember | undefined {
        const userId = this.client.user?.id;
        return userId ? this.members.get(userId) : undefined;
    }

    /** The guild owner as a GuildMember. */
    get owner(): GuildMember | undefined {
        return this.members.get(this.ownerId);
    }

    /** Guild icon URL. */
    iconURL(options?: ImageURLOptions): string | null {
        if (!this.icon) return null;
        return CDN.guildIcon(this.id, this.icon, options);
    }

    /** Guild banner URL. */
    bannerURL(options?: ImageURLOptions): string | null {
        if (!this.banner) return null;
        return CDN.guildBanner(this.id, this.banner, options);
    }

    /** Guild splash URL. */
    splashURL(options?: ImageURLOptions): string | null {
        if (!this.splash) return null;
        return CDN.guildSplash(this.id, this.splash, options);
    }

    /** Fetch fresh guild data from the API. */
    async fetch(): Promise<Guild> {
        const data = await this.client.rest.get<APIGuild>(`/guilds/${this.id}?with_counts=true`);
        this._patch(data);
        return this;
    }

    /** Edit this guild. */
    async edit(data: EditGuildOptions, reason?: string): Promise<Guild> {
        const result = await this.client.rest.patch<APIGuild>(`/guilds/${this.id}`, { body: data, reason });
        this._patch(result);
        return this;
    }

    /** Leave this guild. */
    async leave(): Promise<void> {
        await this.client.rest.delete(`/users/@me/guilds/${this.id}`);
    }

    /** Fetch a specific member by ID. */
    async fetchMember(userId: Snowflake): Promise<GuildMember> {
        const data = await this.client.rest.get<APIGuildMember>(`/guilds/${this.id}/members/${userId}`);
        const user = data.user
            ? (this.client.users.get(data.user.id) ?? new User(this.client, data.user))
            : this.client.users.get(userId)!;
        if (data.user) this.client.users.set(data.user.id, user);

        let member = this.members.get(userId);
        if (member) {
            member._patch(data);
        } else {
            member = new GuildMember(this.client, data, this.id, userId);
            member.user = user;
            this.members.set(userId, member);
        }
        return member;
    }

    /** Create a channel in this guild. */
    async createChannel(data: CreateChannelOptions, reason?: string): Promise<GuildChannel> {
        const result = await this.client.rest.post<APIChannel>(`/guilds/${this.id}/channels`, {
            body: data,
            reason,
        });
        result.guild_id = this.id;
        const channel = channelFrom(this.client, result);
        if (channel instanceof GuildChannel) {
            this.channels.set(result.id, channel);
            this.client.channels.set(result.id, channel);
        }
        return channel as GuildChannel;
    }

    /** Create a role in this guild. */
    async createRole(data?: EditRoleOptions, reason?: string): Promise<Role> {
        const body: Record<string, unknown> = { ...data };
        if (typeof data?.permissions === "bigint") {
            body.permissions = data.permissions.toString();
        }
        const result = await this.client.rest.post<APIRole>(`/guilds/${this.id}/roles`, {
            body,
            reason,
        });
        const role = new Role(this.client, result, this.id);
        this.roles.set(result.id, role);
        return role;
    }

    /** Ban a user from this guild. */
    async ban(userId: Snowflake, options?: { reason?: string; delete_message_seconds?: number }): Promise<void> {
        await this.client.rest.put(`/guilds/${this.id}/bans/${userId}`, {
            body: options?.delete_message_seconds
                ? { delete_message_seconds: options.delete_message_seconds }
                : undefined,
            reason: options?.reason,
        });
    }

    /** Unban a user from this guild. */
    async unban(userId: Snowflake, reason?: string): Promise<void> {
        await this.client.rest.delete(`/guilds/${this.id}/bans/${userId}`, { reason });
    }

    /** Kick a member from this guild. */
    async kick(userId: Snowflake, reason?: string): Promise<void> {
        await this.client.rest.delete(`/guilds/${this.id}/members/${userId}`, { reason });
    }

    /** Set the guild name. */
    setName(name: string, reason?: string): Promise<Guild> {
        return this.edit({ name }, reason);
    }

    /** Set the guild icon. */
    setIcon(icon: string | null, reason?: string): Promise<Guild> {
        return this.edit({ icon }, reason);
    }

    /** Guild discovery splash URL. */
    discoverySplashURL(options?: ImageURLOptions): string | null {
        if (!this.discoverySplash) return null;
        return CDN.discoverySplash(this.id, this.discoverySplash, options);
    }

    /** Fetch all channels in this guild (refreshes cache). */
    async fetchChannels(): Promise<GuildChannel[]> {
        const data = await this.client.fetchGuildChannels(this.id);
        const channels: GuildChannel[] = [];
        for (const ch of data) {
            ch.guild_id = this.id;
            const channel = channelFrom(this.client, ch);
            if (channel instanceof GuildChannel) {
                this.channels.set(ch.id, channel);
                this.client.channels.set(ch.id, channel);
                channels.push(channel);
            }
        }
        return channels;
    }

    /** Fetch all roles in this guild (refreshes cache). */
    async fetchRoles(): Promise<Role[]> {
        const data = await this.client.fetchGuildRoles(this.id);
        this.roles.clear();
        const roles: Role[] = [];
        for (const r of data) {
            const role = new Role(this.client, r, this.id);
            this.roles.set(r.id, role);
            roles.push(role);
        }
        return roles;
    }

    /** Fetch all bans in this guild. */
    fetchBans(): Promise<GuildBan[]> {
        return this.client.getBans(this.id);
    }

    /** Fetch a specific ban. */
    fetchBan(userId: Snowflake): Promise<GuildBan> {
        return this.client.getBan(this.id, userId);
    }

    /** Fetch guild invites. */
    fetchInvites(): Promise<APIInviteMetadata[]> {
        return this.client.getGuildInvites(this.id);
    }

    /** Fetch all emojis in this guild. */
    fetchEmojis(): Promise<APIEmoji[]> {
        return this.client.getGuildEmojis(this.id);
    }

    /** Fetch a specific emoji by ID. */
    fetchEmoji(emojiId: Snowflake): Promise<APIEmoji> {
        return this.client.getGuildEmoji(this.id, emojiId);
    }

    /** Fetch audit log entries. */
    fetchAuditLogs(options?: GetAuditLogOptions): Promise<APIAuditLog> {
        return this.client.getAuditLog(this.id, options);
    }

    /** Fetch guild webhooks. */
    fetchWebhooks(): Promise<APIWebhook[]> {
        return this.client.getGuildWebhooks(this.id);
    }

    /** List guild members. */
    listMembers(options?: ListMembersOptions): Promise<APIGuildMember[]> {
        return this.client.listMembers(this.id, options);
    }

    /** Join a voice channel in this guild. */
    joinVoiceChannel(channelId: Snowflake, options?: { selfMute?: boolean; selfDeaf?: boolean }): VoiceConnection {
        return this.client.joinVoiceChannel(this.id, channelId, options);
    }

    /** Leave the voice channel in this guild. */
    leaveVoiceChannel(): void {
        this.client.leaveVoiceChannel(this.id);
    }

    toString(): string {
        return this.name;
    }

    toJSON(): APIGuild {
        return {
            id: this.id,
            name: this.name,
            icon: this.icon,
            splash: this.splash,
            discovery_splash: this.discoverySplash,
            banner: this.banner,
            owner_id: this.ownerId,
            afk_channel_id: this.afkChannelId,
            afk_timeout: this.afkTimeout,
            verification_level: this.verificationLevel,
            default_message_notifications: this.defaultMessageNotifications,
            explicit_content_filter: this.explicitContentFilter,
            mfa_level: this.mfaLevel,
            system_channel_id: this.systemChannelId,
            system_channel_flags: this.systemChannelFlags,
            rules_channel_id: this.rulesChannelId,
            vanity_url_code: this.vanityURLCode,
            description: this.description,
            premium_tier: this.premiumTier,
            premium_subscription_count: this.premiumSubscriptionCount,
            preferred_locale: this.preferredLocale,
            nsfw_level: this.nsfwLevel,
            features: this.features,
            roles: this.roles.map((r) => r.toJSON()),
            emojis: [],
            application_id: null,
            icon_hash: undefined,
            public_updates_channel_id: null,
            premium_progress_bar_enabled: this.premiumProgressBarEnabled,
            safety_alerts_channel_id: this.safetyAlertsChannelId,
        };
    }
}
