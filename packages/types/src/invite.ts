import type { Snowflake } from "./common.js";
import type { APIUser } from "./user.js";
import type { APIChannel } from "./channel.js";
import type { APIGuild } from "./guild.js";

export enum InviteTargetType {
    Stream = 1,
    EmbeddedApplication = 2,
}

export interface APIInvite {
    code: string;
    guild?: Partial<APIGuild>;
    channel: Partial<APIChannel> | null;
    inviter?: APIUser;
    target_type?: InviteTargetType;
    target_user?: APIUser;
    approximate_presence_count?: number;
    approximate_member_count?: number;
    expires_at?: string | null;
}

export interface APIInviteMetadata extends APIInvite {
    uses: number;
    max_uses: number;
    max_age: number;
    temporary: boolean;
    created_at: string;
}

export interface CreateInviteOptions {
    max_age?: number;
    max_uses?: number;
    temporary?: boolean;
    unique?: boolean;
    target_type?: InviteTargetType;
    target_user_id?: Snowflake;
    target_application_id?: Snowflake;
}
