import type { Snowflake, Timestamp, APIStickerItem } from "./common.js";
import type { HasId } from "./base.js";
import type { APIUser } from "./user.js";
import type { APIGuildMember } from "./member.js";
import type { APIChannel } from "./channel.js";
import type { APIEmoji } from "./emoji.js";

export enum MessageType {
    Default = 0,
    RecipientAdd = 1,
    RecipientRemove = 2,
    Call = 3,
    ChannelNameChange = 4,
    ChannelIconChange = 5,
    ChannelPinnedMessage = 6,
    UserJoin = 7,
    GuildBoost = 8,
    GuildBoostTier1 = 9,
    GuildBoostTier2 = 10,
    GuildBoostTier3 = 11,
    ChannelFollowAdd = 12,
    GuildDiscoveryDisqualified = 14,
    GuildDiscoveryRequalified = 15,
    Reply = 19,
    ChatInputCommand = 20,
    ThreadStarterMessage = 21,
    GuildInviteReminder = 22,
    ContextMenuCommand = 23,
    AutoModerationAction = 24,
    RoleSubscriptionPurchase = 25,
    InteractionPremiumUpsell = 26,
    StageStart = 27,
    StageEnd = 28,
    StageSpeaker = 29,
    StageTopic = 31,
    GuildApplicationPremiumSubscription = 32,
}

export interface APIMessage extends HasId {
    id: Snowflake;
    channel_id: Snowflake;
    author: APIUser;
    content: string;
    timestamp: Timestamp;
    edited_timestamp: Timestamp | null;
    tts: boolean;
    mention_everyone: boolean;
    mentions: APIUser[];
    mention_roles: Snowflake[];
    mention_channels?: APIChannelMention[];
    attachments: APIAttachment[];
    embeds: APIEmbed[];
    reactions?: APIReaction[];
    nonce?: string | number;
    pinned: boolean;
    webhook_id?: Snowflake;
    type: MessageType;
    activity?: APIMessageActivity;
    application_id?: Snowflake;
    message_reference?: APIMessageReference;
    flags?: number;
    referenced_message?: APIMessage | null;
    thread?: APIChannel;
    components?: APIMessageComponent[];
    sticker_items?: APIStickerItem[];
    guild_id?: Snowflake;
    member?: APIGuildMember;
}

export interface APIAttachment extends HasId {
    id: Snowflake;
    filename: string;
    description?: string;
    content_type?: string;
    size: number;
    url: string;
    proxy_url: string;
    height?: number | null;
    width?: number | null;
    ephemeral?: boolean;
    duration_secs?: number;
    waveform?: string;
    flags?: number;
}

export interface APIEmbed {
    title?: string;
    type?: string;
    description?: string;
    url?: string;
    timestamp?: Timestamp;
    color?: number;
    footer?: APIEmbedFooter;
    image?: APIEmbedMedia;
    thumbnail?: APIEmbedMedia;
    video?: APIEmbedMedia;
    provider?: APIEmbedProvider;
    author?: APIEmbedAuthor;
    fields?: APIEmbedField[];
}

export interface APIEmbedFooter {
    text: string;
    icon_url?: string;
    proxy_icon_url?: string;
}

export interface APIEmbedMedia {
    url: string;
    proxy_url?: string;
    height?: number;
    width?: number;
}

export interface APIEmbedProvider {
    name?: string;
    url?: string;
}

export interface APIEmbedAuthor {
    name: string;
    url?: string;
    icon_url?: string;
    proxy_icon_url?: string;
}

export interface APIEmbedField {
    name: string;
    value: string;
    inline?: boolean;
}

export interface APIReaction {
    count: number;
    count_details: { burst: number; normal: number };
    me: boolean;
    me_burst: boolean;
    emoji: APIEmoji;
    burst_colors: string[];
}

export interface APIChannelMention {
    id: Snowflake;
    guild_id: Snowflake;
    type: number;
    name: string;
}

export interface APIMessageActivity {
    type: number;
    party_id?: string;
}

export interface APIMessageReference {
    message_id?: Snowflake;
    channel_id?: Snowflake;
    guild_id?: Snowflake;
    fail_if_not_exists?: boolean;
}

export interface APIMessageComponent {
    type: number;
    [key: string]: unknown;
}

export enum AllowedMentionsTypes {
    Role = "roles",
    User = "users",
    Everyone = "everyone",
}

export interface APIAllowedMentions {
    parse?: AllowedMentionsTypes[];
    roles?: Snowflake[];
    users?: Snowflake[];
    replied_user?: boolean;
}
