import type { Snowflake } from "./common.js";
import type { LocaleString } from "./locale.js";
import type { HasId } from "./base.js";
import type { APIUser } from "./user.js";
import type { APIGuildMember } from "./member.js";
import type { APIMessage, APIAttachment } from "./message.js";
import type { APIRole } from "./role.js";
import type { APIChannel } from "./channel.js";

export enum InteractionType {
    Ping = 1,
    ApplicationCommand = 2,
    MessageComponent = 3,
    ApplicationCommandAutocomplete = 4,
    ModalSubmit = 5,
}

export enum ApplicationCommandType {
    ChatInput = 1,
    User = 2,
    Message = 3,
}

export interface APIInteraction extends HasId {
    id: Snowflake;
    application_id: Snowflake;
    type: InteractionType;
    data?: APIInteractionData;
    guild_id?: Snowflake;
    channel_id?: Snowflake;
    member?: APIGuildMember;
    user?: APIUser;
    token: string;
    version: number;
    message?: APIMessage;
    app_permissions?: string;
    locale?: LocaleString;
    guild_locale?: LocaleString;
    entitlements: APIEntitlement[];
}

export interface APIInteractionData {
    id?: Snowflake;
    name?: string;
    type?: ApplicationCommandType;
    options?: APIApplicationCommandOption[];
    custom_id?: string;
    component_type?: number;
    values?: string[];
    target_id?: Snowflake;
    resolved?: APIResolvedData;
}

export interface APIApplicationCommandOption {
    name: string;
    type: number;
    value?: string | number | boolean;
    options?: APIApplicationCommandOption[];
    focused?: boolean;
}

export interface APIResolvedData {
    users?: Record<Snowflake, APIUser>;
    members?: Record<Snowflake, APIGuildMember>;
    roles?: Record<Snowflake, APIRole>;
    channels?: Record<Snowflake, Partial<APIChannel>>;
    messages?: Record<Snowflake, APIMessage>;
    attachments?: Record<Snowflake, APIAttachment>;
}

export interface APIEntitlement {
    id: Snowflake;
    sku_id: Snowflake;
    application_id: Snowflake;
    user_id?: Snowflake;
    type: number;
    deleted: boolean;
    starts_at?: string;
    ends_at?: string;
    guild_id?: Snowflake;
}
