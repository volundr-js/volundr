import type { Snowflake } from "./common.js";
import type { HasId, Nameable, Mentionable } from "./base.js";

export interface APIRole extends HasId, Nameable, Mentionable {
    id: Snowflake;
    name: string;
    color: number;
    hoist: boolean;
    icon?: string | null;
    unicode_emoji?: string | null;
    position: number;
    permissions: string;
    managed: boolean;
    mentionable: boolean;
    tags?: APIRoleTags;
    flags: number;
}

export interface APIRoleTags {
    bot_id?: Snowflake;
    integration_id?: Snowflake;
    premium_subscriber?: null;
    subscription_listing_id?: Snowflake;
    available_for_purchase?: null;
    guild_connections?: null;
}
