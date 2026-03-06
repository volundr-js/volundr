import type { APIGuildMember, APIOverwrite, Snowflake, Timestamp } from "@volundr/types";
import { BaseEntity } from "./Base.js";
import { Collection } from "../collection/Collection.js";
import { Permissions, PermissionFlags } from "../permissions/Permissions.js";
import { CDN } from "../cdn/CDN.js";
import type { Client } from "../Client.js";
import type { User, ImageURLOptions } from "./User.js";
import type { Role } from "./Role.js";
import type { Guild } from "./Guild.js";

export interface EditMemberData {
    nick?: string | null;
    roles?: Snowflake[];
    mute?: boolean;
    deaf?: boolean;
    channel_id?: Snowflake | null;
    communication_disabled_until?: string | null;
}

export class GuildMember extends BaseEntity {
    guildId: Snowflake;
    nickname!: string | null;
    avatar!: string | null;
    roleIds!: Snowflake[];
    deaf!: boolean;
    mute!: boolean;
    flags!: number;
    pending!: boolean;

    /** The User object for this member. Set by EntityFactory or CacheManager. */
    user!: User;

    /** Lazy Date: raw ISO strings, Date objects created on first access. */
    private _rawJoinedAt!: string;
    private _cachedJoinedAt: Date | undefined;
    private _rawPremiumSince!: string | null;
    private _cachedPremiumSince: Date | null | undefined;
    private _rawCommunicationDisabledUntil!: string | null;
    private _cachedCommunicationDisabledUntil: Date | null | undefined;

    /** Lazy Set: created on first access, invalidated on _patch. */
    private _cachedRoleIdSet: Set<Snowflake> | undefined;

    /** Timestamp when this member joined. Lazily parsed. */
    get joinedAt(): Date {
        return this._cachedJoinedAt ??= new Date(this._rawJoinedAt);
    }

    /** Timestamp when this member started boosting. Lazily parsed. */
    get premiumSince(): Date | null {
        if (this._rawPremiumSince === null) return null;
        if (this._cachedPremiumSince !== undefined) return this._cachedPremiumSince;
        this._cachedPremiumSince = new Date(this._rawPremiumSince);
        return this._cachedPremiumSince;
    }

    /** Timestamp when timeout expires. Lazily parsed. */
    get communicationDisabledUntil(): Date | null {
        if (this._rawCommunicationDisabledUntil === null) return null;
        if (this._cachedCommunicationDisabledUntil !== undefined) return this._cachedCommunicationDisabledUntil;
        this._cachedCommunicationDisabledUntil = new Date(this._rawCommunicationDisabledUntil);
        return this._cachedCommunicationDisabledUntil;
    }

    /** Set of role IDs for O(1) lookup. Lazily built from roleIds. */
    get _roleIdSet(): Set<Snowflake> {
        return this._cachedRoleIdSet ??= new Set(this.roleIds);
    }

    constructor(client: Client, data: APIGuildMember, guildId: Snowflake, userId: Snowflake) {
        super(client, userId);
        this.guildId = guildId;
        this._patch(data);
    }

    _patch(data: Partial<APIGuildMember>): void {
        if (data.nick !== undefined) this.nickname = data.nick ?? null;
        else if (this.nickname === undefined) this.nickname = null;
        if (data.avatar !== undefined) this.avatar = data.avatar ?? null;
        else if (this.avatar === undefined) this.avatar = null;
        if (data.roles !== undefined) {
            this.roleIds = data.roles;
            this._cachedRoleIdSet = undefined; // invalidate lazy Set
        } else if (this.roleIds === undefined) {
            this.roleIds = [];
            this._cachedRoleIdSet = undefined;
        }
        if (data.joined_at !== undefined) {
            this._rawJoinedAt = data.joined_at;
            this._cachedJoinedAt = undefined;
        }
        if (data.premium_since !== undefined) {
            this._rawPremiumSince = data.premium_since ?? null;
            this._cachedPremiumSince = undefined;
        } else if (this._rawPremiumSince === undefined) {
            this._rawPremiumSince = null;
        }
        if (data.deaf !== undefined) this.deaf = data.deaf;
        if (data.mute !== undefined) this.mute = data.mute;
        if (data.flags !== undefined) this.flags = data.flags;
        else if (this.flags === undefined) this.flags = 0;
        if (data.pending !== undefined) this.pending = data.pending;
        else if (this.pending === undefined) this.pending = false;
        if (data.communication_disabled_until !== undefined) {
            this._rawCommunicationDisabledUntil = data.communication_disabled_until ?? null;
            this._cachedCommunicationDisabledUntil = undefined;
        } else if (this._rawCommunicationDisabledUntil === undefined) {
            this._rawCommunicationDisabledUntil = null;
        }
    }

    /** The guild this member belongs to. */
    get guild(): Guild | undefined {
        return this.client.guilds.get(this.guildId);
    }

    /** Collection of this member's roles (excluding @everyone). */
    get roles(): Collection<Snowflake, Role> {
        const guild = this.guild;
        if (!guild) return new Collection();
        return guild.roles.filter((role) => this._roleIdSet.has(role.id));
    }

    /** Display name: nickname > global_name > username. */
    get displayName(): string {
        return this.nickname ?? this.user?.displayName ?? "Unknown";
    }

    /** URL of the member's guild-specific avatar, or their user avatar. */
    displayAvatarURL(options?: ImageURLOptions): string {
        if (this.avatar) {
            return CDN.memberAvatar(this.guildId, this.id, this.avatar, options);
        }
        return this.user?.displayAvatarURL(options) ?? CDN.defaultAvatar(this.id);
    }

    /** Compute effective permissions from all roles. */
    get permissions(): Permissions {
        const guild = this.guild;
        if (!guild) return new Permissions(0n);
        if (guild.ownerId === this.id) return new Permissions(~0n); // owner has all

        const everyoneRole = guild.roles.get(this.guildId);
        let bits = everyoneRole ? everyoneRole.permissions.bitfield : 0n;
        // Inline role iteration - avoids constructing an intermediate Collection
        for (const role of guild.roles.values()) {
            if (this._roleIdSet.has(role.id)) {
                bits |= role.permissions.bitfield;
            }
        }

        // Administrator grants all permissions
        if (bits & PermissionFlags.Administrator) return new Permissions(~0n);
        return new Permissions(bits);
    }

    /** Compute effective permissions in a specific channel, including overwrites. */
    getPermissionsIn(channel: { permissionOverwrites: APIOverwrite[] }): Permissions {
        const guild = this.guild;
        if (!guild) return new Permissions(0n);
        if (guild.ownerId === this.id) return new Permissions(~0n);

        let bits = this.permissions.bitfield;
        if (bits & PermissionFlags.Administrator) return new Permissions(~0n);

        // Single-pass: classify overwrites into @everyone, role, and member buckets
        let everyoneDeny = 0n, everyoneAllow = 0n;
        let roleDeny = 0n, roleAllow = 0n;
        let memberDeny = 0n, memberAllow = 0n;

        for (const ow of channel.permissionOverwrites) {
            if (ow.type === 0) {
                if (ow.id === this.guildId) {
                    everyoneDeny = BigInt(ow.deny);
                    everyoneAllow = BigInt(ow.allow);
                } else if (this._roleIdSet.has(ow.id)) {
                    roleDeny |= BigInt(ow.deny);
                    roleAllow |= BigInt(ow.allow);
                }
            } else if (ow.type === 1 && ow.id === this.id) {
                memberDeny = BigInt(ow.deny);
                memberAllow = BigInt(ow.allow);
            }
        }

        // Apply in order: @everyone → roles → member
        bits &= ~everyoneDeny;
        bits |= everyoneAllow;
        bits &= ~roleDeny;
        bits |= roleAllow;
        bits &= ~memberDeny;
        bits |= memberAllow;

        return new Permissions(bits);
    }

    /** Whether the bot can manage this member (role hierarchy check). */
    get manageable(): boolean {
        const guild = this.guild;
        if (!guild) return false;
        if (guild.ownerId === this.id) return false;
        const me = guild.members.get(this.client.user?.id ?? "");
        if (!me) return false;
        if (guild.ownerId === me.id) return true;
        return me.highestRole.comparePositionTo(this.highestRole) > 0;
    }

    /** Whether the bot can kick this member. */
    get kickable(): boolean {
        return this.manageable && this.permissions.has(PermissionFlags.KickMembers);
    }

    /** Whether the bot can ban this member. */
    get bannable(): boolean {
        return this.manageable && this.permissions.has(PermissionFlags.BanMembers);
    }

    /** This member's highest role by position. */
    get highestRole(): Role {
        const guild = this.guild!;
        let highest: Role | undefined;
        for (const role of guild.roles.values()) {
            if (this._roleIdSet.has(role.id)) {
                if (!highest || role.position > highest.position) highest = role;
            }
        }
        return highest ?? guild.roles.get(this.guildId)!; // fallback to @everyone
    }

    /** Check if this member has a specific permission. */
    hasPermission(flag: bigint): boolean {
        return this.permissions.has(flag);
    }

    /** Whether this member is currently timed out. Uses raw string to avoid lazy Date creation. */
    get isCommunicationDisabled(): boolean {
        if (this._rawCommunicationDisabledUntil === null) return false;
        return new Date(this._rawCommunicationDisabledUntil).getTime() > Date.now();
    }

    /** Edit this member. */
    async edit(data: EditMemberData, reason?: string): Promise<GuildMember> {
        const result = await this.client.rest.patch<APIGuildMember>(
            `/guilds/${this.guildId}/members/${this.id}`,
            { body: data, reason },
        );
        this._patch(result);
        return this;
    }

    /** Kick this member from the guild. */
    async kick(reason?: string): Promise<void> {
        await this.client.rest.delete(`/guilds/${this.guildId}/members/${this.id}`, { reason });
    }

    /** Ban this member from the guild. */
    async ban(options?: { reason?: string; delete_message_seconds?: number }): Promise<void> {
        await this.client.rest.put(`/guilds/${this.guildId}/bans/${this.id}`, {
            body: options?.delete_message_seconds
                ? { delete_message_seconds: options.delete_message_seconds }
                : undefined,
            reason: options?.reason,
        });
    }

    /** Add a role to this member. */
    async addRole(roleId: Snowflake, reason?: string): Promise<void> {
        await this.client.rest.put(
            `/guilds/${this.guildId}/members/${this.id}/roles/${roleId}`,
            { reason },
        );
    }

    /** Remove a role from this member. */
    async removeRole(roleId: Snowflake, reason?: string): Promise<void> {
        await this.client.rest.delete(
            `/guilds/${this.guildId}/members/${this.id}/roles/${roleId}`,
            { reason },
        );
    }

    /** Set this member's nickname. */
    setNickname(nick: string | null, reason?: string): Promise<GuildMember> {
        return this.edit({ nick }, reason);
    }

    /** Timeout this member. Pass null to remove timeout. */
    async timeout(until: Date | null, reason?: string): Promise<GuildMember> {
        return this.edit({
            communication_disabled_until: until?.toISOString() ?? null,
        }, reason);
    }

    /** Fetch fresh member data from the API. */
    async fetch(): Promise<GuildMember> {
        const data = await this.client.rest.get<APIGuildMember>(
            `/guilds/${this.guildId}/members/${this.id}`,
        );
        this._patch(data);
        return this;
    }

    /** Mention string. */
    toString(): string {
        return `<@${this.id}>`;
    }

    toJSON(): APIGuildMember {
        return {
            nick: this.nickname,
            avatar: this.avatar,
            roles: this.roleIds,
            joined_at: this._rawJoinedAt,
            premium_since: this._rawPremiumSince ?? null,
            deaf: this.deaf,
            mute: this.mute,
            flags: this.flags,
            pending: this.pending || undefined,
            communication_disabled_until: this._rawCommunicationDisabledUntil ?? null,
        };
    }
}
