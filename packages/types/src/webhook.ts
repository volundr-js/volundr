import type { Snowflake } from "./common.js";
import type { APIUser } from "./user.js";
import type { APIChannel } from "./channel.js";
import type { APIGuild } from "./guild.js";

export enum WebhookType {
    Incoming = 1,
    ChannelFollower = 2,
    Application = 3,
}

export interface APIWebhook {
    id: Snowflake;
    type: WebhookType;
    guild_id?: Snowflake | null;
    channel_id: Snowflake | null;
    user?: APIUser;
    name: string | null;
    avatar: string | null;
    token?: string;
    application_id: Snowflake | null;
    source_guild?: Partial<APIGuild>;
    source_channel?: Partial<APIChannel>;
    url?: string;
}

export interface CreateWebhookOptions {
    name: string;
    avatar?: string | null;
}

export interface EditWebhookOptions {
    name?: string;
    avatar?: string | null;
    channel_id?: Snowflake;
}
