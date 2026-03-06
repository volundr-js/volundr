import type { Snowflake, Timestamp } from "./common.js";
import type { APIUser } from "./user.js";

export interface APIGuildMember {
    user?: APIUser;
    nick?: string | null;
    avatar?: string | null;
    roles: Snowflake[];
    joined_at: Timestamp;
    premium_since?: Timestamp | null;
    deaf: boolean;
    mute: boolean;
    flags: number;
    pending?: boolean;
    permissions?: string;
    communication_disabled_until?: Timestamp | null;
}
