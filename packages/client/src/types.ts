import type { GatewayPresence } from "@volundr/gateway";
import type { FileAttachment } from "@volundr/rest";
import type { ThreadPoolOptions } from "@volundr/threads";
import type {
    GatewayEvents,
    APIEmbed,
    APIActionRow,
    APITopLevelComponent,
    APIAllowedMentions,
    Snowflake,
    ChannelType,
    InteractionResponseType,
    APIInteractionCallbackData,
} from "@volundr/types";

export interface ClientOptions {
    token: string;
    intents: number;
    apiVersion?: number;
    baseUrl?: string;
    maxRetries?: number;
    largeThreshold?: number;
    presence?: GatewayPresence;
    messageCacheLimit?: number;
    shardCount?: number | "auto";
    pool?: boolean | ThreadPoolOptions;
    /** Enable zlib-stream transport compression on the gateway connection. */
    compress?: boolean;
    /** Cache sweeper configuration. */
    sweepers?: import("./cache/Sweepers.js").SweeperConfig;
    /** Partial entity types to accept for uncached data. */
    partials?: import("./utils/Partials.js").PartialType[];
}

export interface CreateMessageOptions {
    content?: string;
    embeds?: APIEmbed[];
    components?: (APIActionRow | APITopLevelComponent)[];
    flags?: number;
    tts?: boolean;
    reply_to?: Snowflake;
    files?: FileAttachment[];
    allowed_mentions?: APIAllowedMentions;
}

export interface EditMessageOptions {
    content?: string;
    embeds?: APIEmbed[];
    components?: (APIActionRow | APITopLevelComponent)[];
    flags?: number;
    files?: FileAttachment[];
    allowed_mentions?: APIAllowedMentions;
}

export interface FetchMessagesOptions {
    limit?: number;
    before?: Snowflake;
    after?: Snowflake;
    around?: Snowflake;
}

export interface BanOptions {
    reason?: string;
    delete_message_seconds?: number;
}

export interface EditMemberOptions {
    nick?: string | null;
    roles?: Snowflake[];
    mute?: boolean;
    deaf?: boolean;
    channel_id?: Snowflake | null;
    communication_disabled_until?: string | null;
}

export interface CreateRoleOptions {
    name?: string;
    color?: number;
    permissions?: string;
    hoist?: boolean;
    mentionable?: boolean;
}

export interface CreateChannelOptions {
    name: string;
    type?: ChannelType;
    topic?: string;
    position?: number;
    parent_id?: Snowflake;
    nsfw?: boolean;
    rate_limit_per_user?: number;
    bitrate?: number;
    user_limit?: number;
}

export interface InteractionResponseOptions {
    type: InteractionResponseType;
    data?: APIInteractionCallbackData;
    files?: FileAttachment[];
}

export interface ListMembersOptions {
    limit?: number;
    after?: Snowflake;
}

export interface PruneMembersOptions {
    days?: number;
    compute_prune_count?: boolean;
    include_roles?: Snowflake[];
}

export interface PruneResult {
    pruned: number | null;
}

export interface GuildBan {
    reason: string | null;
    user: import("@volundr/types").APIUser;
}

export interface GetAuditLogOptions {
    user_id?: Snowflake;
    action_type?: number;
    before?: Snowflake;
    after?: Snowflake;
    limit?: number;
}

export interface RequestGuildMembersOptions {
    query?: string;
    limit?: number;
    presences?: boolean;
    user_ids?: Snowflake | Snowflake[];
    nonce?: string;
}

export interface FetchMembersOptions {
    query?: string;
    limit?: number;
    presences?: boolean;
    user_ids?: Snowflake | Snowflake[];
    /** Timeout in milliseconds. Defaults to 120 000 (2 minutes). */
    timeout?: number;
}

export interface PermissionOverwriteData {
    /** 0 = role, 1 = member */
    type: 0 | 1;
    allow?: string;
    deny?: string;
}

export interface GuildWidgetSettings {
    enabled: boolean;
    channel_id: Snowflake | null;
}

export interface GuildVanityUrl {
    code: string | null;
    uses: number;
}

type EntityEventOverrides = {
    MESSAGE_CREATE: import("./entities/Message.js").Message;
    MESSAGE_UPDATE: import("./entities/Message.js").Message;
    INTERACTION_CREATE: import("./entities/interactions/index.js").Interaction;
    GUILD_CREATE: import("./entities/Guild.js").Guild;
    GUILD_MEMBER_ADD: import("./entities/GuildMember.js").GuildMember;
};

export interface ClientEvents extends Omit<GatewayEvents, keyof EntityEventOverrides> {
    ready: void;
    error: Error;

    MESSAGE_CREATE: import("./entities/Message.js").Message;
    MESSAGE_UPDATE: import("./entities/Message.js").Message;
    INTERACTION_CREATE: import("./entities/interactions/index.js").Interaction;
    GUILD_CREATE: import("./entities/Guild.js").Guild;
    GUILD_MEMBER_ADD: import("./entities/GuildMember.js").GuildMember;
}
