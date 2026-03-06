import type { APIInvite, APIInviteMetadata, Snowflake } from "@volundr/types";
import type { Client } from "../Client.js";
import type { User } from "./User.js";
import type { Guild } from "./Guild.js";
import type { Channel } from "./channels/index.js";

/**
 * Rich invite entity with methods for managing invites.
 */
export class Invite {
    readonly client: Client;
    readonly code: string;
    readonly guildId: Snowflake | undefined;
    readonly channelId: Snowflake | undefined;
    readonly inviterId: Snowflake | undefined;
    readonly targetType: number | undefined;
    readonly targetUserId: Snowflake | undefined;
    readonly approximatePresenceCount: number | undefined;
    readonly approximateMemberCount: number | undefined;
    readonly expiresAt: Date | null;

    // Metadata (present when fetched with metadata)
    readonly uses: number | undefined;
    readonly maxUses: number | undefined;
    readonly maxAge: number | undefined;
    readonly temporary: boolean | undefined;
    readonly createdAt: Date | undefined;

    private readonly _raw: APIInvite;

    constructor(client: Client, data: APIInvite | APIInviteMetadata) {
        this.client = client;
        this._raw = data;
        this.code = data.code;
        this.guildId = data.guild?.id;
        this.channelId = data.channel?.id ?? undefined;
        this.inviterId = data.inviter?.id;
        this.targetType = data.target_type;
        this.targetUserId = data.target_user?.id;
        this.approximatePresenceCount = data.approximate_presence_count;
        this.approximateMemberCount = data.approximate_member_count;
        this.expiresAt = data.expires_at ? new Date(data.expires_at) : null;

        // Metadata fields
        if ("uses" in data) {
            const meta = data as APIInviteMetadata;
            this.uses = meta.uses;
            this.maxUses = meta.max_uses;
            this.maxAge = meta.max_age;
            this.temporary = meta.temporary;
            this.createdAt = new Date(meta.created_at);
        }
    }

    /** The guild this invite is for (from cache). */
    get guild(): Guild | undefined {
        return this.guildId ? this.client.guilds.get(this.guildId) : undefined;
    }

    /** The channel this invite is for (from cache). */
    get channel(): Channel | undefined {
        return this.channelId ? this.client.channels.get(this.channelId) : undefined;
    }

    /** The user who created this invite (from cache). */
    get inviter(): User | undefined {
        return this.inviterId ? this.client.users.get(this.inviterId) : undefined;
    }

    /** The full invite URL. */
    get url(): string {
        return `https://discord.gg/${this.code}`;
    }

    /** Whether this invite expires. */
    get isExpired(): boolean {
        return this.expiresAt !== null && this.expiresAt.getTime() < Date.now();
    }

    /** Delete this invite. */
    async delete(reason?: string): Promise<Invite> {
        const data = await this.client.deleteInvite(this.code, reason);
        return new Invite(this.client, data);
    }

    toString(): string {
        return this.url;
    }

    toJSON(): APIInvite {
        return this._raw;
    }
}
