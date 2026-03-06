import type { Snowflake } from "./common.js";
import type { APIEmoji } from "./emoji.js";
import type { APIApplicationCommandOptionChoice } from "./command.js";

export enum ComponentType {
    ActionRow = 1,
    Button = 2,
    StringSelect = 3,
    TextInput = 4,
    UserSelect = 5,
    RoleSelect = 6,
    MentionableSelect = 7,
    ChannelSelect = 8,
    // Components V2
    Section = 9,
    TextDisplay = 10,
    Thumbnail = 11,
    MediaGallery = 12,
    File = 13,
    Separator = 14,
    Container = 17,
}

export enum ButtonStyle {
    Primary = 1,
    Secondary = 2,
    Success = 3,
    Danger = 4,
    Link = 5,
}

export enum TextInputStyle {
    Short = 1,
    Paragraph = 2,
}

export enum SeparatorSpacing {
    Small = 1,
    Large = 2,
}

export enum MessageFlags {
    Ephemeral = 1 << 6,
    IsComponentsV2 = 1 << 15,
}

export interface APIActionRow {
    type: ComponentType.ActionRow;
    components: APIComponent[];
}

export interface APIButton {
    type: ComponentType.Button;
    style: ButtonStyle;
    label?: string;
    emoji?: Pick<APIEmoji, "id" | "name" | "animated">;
    custom_id?: string;
    url?: string;
    disabled?: boolean;
}

export interface APIStringSelect {
    type: ComponentType.StringSelect;
    custom_id: string;
    options: APISelectOption[];
    placeholder?: string;
    min_values?: number;
    max_values?: number;
    disabled?: boolean;
}

export interface APISelectOption {
    label: string;
    value: string;
    description?: string;
    emoji?: Pick<APIEmoji, "id" | "name" | "animated">;
    default?: boolean;
}

export interface APIUserSelect {
    type: ComponentType.UserSelect;
    custom_id: string;
    placeholder?: string;
    min_values?: number;
    max_values?: number;
    disabled?: boolean;
}

export interface APIRoleSelect {
    type: ComponentType.RoleSelect;
    custom_id: string;
    placeholder?: string;
    min_values?: number;
    max_values?: number;
    disabled?: boolean;
}

export interface APIMentionableSelect {
    type: ComponentType.MentionableSelect;
    custom_id: string;
    placeholder?: string;
    min_values?: number;
    max_values?: number;
    disabled?: boolean;
}

export interface APIChannelSelect {
    type: ComponentType.ChannelSelect;
    custom_id: string;
    placeholder?: string;
    min_values?: number;
    max_values?: number;
    channel_types?: number[];
    disabled?: boolean;
}

export interface APITextInput {
    type: ComponentType.TextInput;
    custom_id: string;
    style: TextInputStyle;
    label: string;
    placeholder?: string;
    min_length?: number;
    max_length?: number;
    required?: boolean;
    value?: string;
}

// --- Components V2 ---

export interface APITextDisplay {
    type: ComponentType.TextDisplay;
    content: string;
}

export interface APIThumbnail {
    type: ComponentType.Thumbnail;
    media: { url: string };
    description?: string;
    spoiler?: boolean;
}

export interface APISection {
    type: ComponentType.Section;
    components: APITextDisplay[];
    accessory: APIThumbnail | APIButton;
}

export interface APIMediaGalleryItem {
    media: { url: string };
    description?: string;
    spoiler?: boolean;
}

export interface APIMediaGallery {
    type: ComponentType.MediaGallery;
    items: APIMediaGalleryItem[];
}

export interface APIFile {
    type: ComponentType.File;
    file: { url: string };
}

export interface APISeparator {
    type: ComponentType.Separator;
    divider?: boolean;
    spacing?: SeparatorSpacing;
}

export interface APIContainer {
    type: ComponentType.Container;
    accent_color?: number;
    spoiler?: boolean;
    components: APITopLevelComponent[];
}

export type APITopLevelComponent =
    | APIActionRow
    | APISection
    | APITextDisplay
    | APIMediaGallery
    | APIFile
    | APISeparator
    | APIContainer;

export type APIComponent =
    | APIActionRow
    | APIButton
    | APIStringSelect
    | APIUserSelect
    | APIRoleSelect
    | APIMentionableSelect
    | APIChannelSelect
    | APITextInput
    | APITextDisplay
    | APIThumbnail
    | APISection
    | APIMediaGallery
    | APIFile
    | APISeparator
    | APIContainer;

export interface APIModal {
    custom_id: string;
    title: string;
    components: APIActionRow[];
}

export enum InteractionResponseType {
    Pong = 1,
    ChannelMessageWithSource = 4,
    DeferredChannelMessageWithSource = 5,
    DeferredMessageUpdate = 6,
    UpdateMessage = 7,
    ApplicationCommandAutocompleteResult = 8,
    Modal = 9,
}

export interface APIInteractionResponse {
    type: InteractionResponseType;
    data?: APIInteractionCallbackData;
}

export interface APIInteractionCallbackData {
    content?: string;
    embeds?: unknown[];
    components?: (APIActionRow | APITopLevelComponent)[];
    flags?: number;
    tts?: boolean;
    choices?: APIApplicationCommandOptionChoice[];
}
