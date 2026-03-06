import type { Snowflake } from "./common.js";
import type { LocaleString } from "./locale.js";
import type { ApplicationCommandType } from "./interaction.js";

export enum ApplicationCommandOptionType {
    SubCommand = 1,
    SubCommandGroup = 2,
    String = 3,
    Integer = 4,
    Boolean = 5,
    User = 6,
    Channel = 7,
    Role = 8,
    Mentionable = 9,
    Number = 10,
    Attachment = 11,
}

export interface APIApplicationCommand {
    id: Snowflake;
    type?: ApplicationCommandType;
    application_id: Snowflake;
    guild_id?: Snowflake;
    name: string;
    name_localizations?: Partial<Record<LocaleString, string>> | null;
    description: string;
    description_localizations?: Partial<Record<LocaleString, string>> | null;
    options?: APIApplicationCommandOptionData[];
    default_member_permissions: string | null;
    dm_permission?: boolean;
    nsfw?: boolean;
    version: Snowflake;
}

export interface APIApplicationCommandOptionData {
    type: ApplicationCommandOptionType;
    name: string;
    name_localizations?: Partial<Record<LocaleString, string>> | null;
    description: string;
    description_localizations?: Partial<Record<LocaleString, string>> | null;
    required?: boolean;
    choices?: APIApplicationCommandOptionChoice[];
    options?: APIApplicationCommandOptionData[];
    channel_types?: number[];
    min_value?: number;
    max_value?: number;
    min_length?: number;
    max_length?: number;
    autocomplete?: boolean;
}

export interface APIApplicationCommandOptionChoice {
    name: string;
    name_localizations?: Partial<Record<LocaleString, string>> | null;
    value: string | number;
}

export interface CreateApplicationCommandData {
    name: string;
    name_localizations?: Partial<Record<LocaleString, string>> | null;
    description?: string;
    description_localizations?: Partial<Record<LocaleString, string>> | null;
    options?: APIApplicationCommandOptionData[];
    default_member_permissions?: string | null;
    dm_permission?: boolean;
    type?: ApplicationCommandType;
    nsfw?: boolean;
}
