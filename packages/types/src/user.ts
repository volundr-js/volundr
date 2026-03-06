import type { Snowflake } from "./common.js";
import type { HasId, Mentionable } from "./base.js";

export interface APIUser extends HasId, Mentionable {
    id: Snowflake;
    username: string;
    discriminator: string;
    global_name: string | null;
    avatar: string | null;
    bot?: boolean;
    system?: boolean;
    mfa_enabled?: boolean;
    banner?: string | null;
    accent_color?: number | null;
    locale?: string;
    verified?: boolean;
    email?: string | null;
    flags?: number;
    premium_type?: number;
    public_flags?: number;
    avatar_decoration_data?: APIAvatarDecorationData | null;
}

export interface APIAvatarDecorationData {
    asset: string;
    sku_id: Snowflake;
}
