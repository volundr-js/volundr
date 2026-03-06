export { Client } from "./Client.js";

// Collection (replaces CacheStore)
export { Collection } from "./collection/Collection.js";
/** @deprecated Use Collection instead */
export { CacheStore } from "./cache/index.js";

// Entities
export {
    BaseEntity,
    User,
    Role,
    GuildMember,
    Guild,
    Message,
    GuildEmoji,
    VoiceState,
    Presence,
    Invite,
    Webhook,
    // Channels
    BaseChannel,
    GuildChannel,
    TextChannel,
    VoiceChannel,
    CategoryChannel,
    DMChannel,
    AnnouncementChannel,
    ForumChannel,
    StageChannel,
    ThreadChannel,
    channelFrom,
    // Interactions
    BaseInteraction,
    ChatInputInteraction,
    InteractionOptions,
    ContextMenuInteraction,
    ButtonInteraction,
    SelectMenuInteraction,
    ModalSubmitInteraction,
    AutocompleteInteraction,
    interactionFrom,
} from "./entities/index.js";

export type {
    ImageURLOptions,
    EditRoleOptions,
    EditMemberData,
    EditGuildOptions,
    EditChannelOptions,
    EditThreadOptions,
    CreateForumPostOptions,
    Channel,
    TextBasedChannel,
    VoiceBasedChannel,
    Interaction,
    InteractionReplyOptions,
} from "./entities/index.js";

// Builders
export {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    StringSelectBuilder,
    UserSelectBuilder,
    RoleSelectBuilder,
    MentionableSelectBuilder,
    ChannelSelectBuilder,
    TextInputBuilder,
    ModalBuilder,
    // Components V2
    TextDisplayBuilder,
    ThumbnailBuilder,
    SectionBuilder,
    MediaGalleryBuilder,
    SeparatorBuilder,
    ContainerBuilder,
    // Command Builders
    SlashCommandBuilder,
    SlashCommandSubcommandBuilder,
    SlashCommandSubcommandGroupBuilder,
    SlashCommandOptionBuilder,
    ContextMenuCommandBuilder,
    // Inline Message DSL
    InlineMessage,
    InlineEmbed,
    resolveMessageInput,
    // Functional helpers
    embed,
    field,
    row,
    button,
    linkButton,
    option,
    // Attachment
    AttachmentBuilder,
    // Activity / Presence
    ActivityBuilder,
    PresenceBuilder,
} from "./builders/index.js";
export type { MessageInput, EmbedData } from "./builders/index.js";

// Permissions
export { Permissions, PermissionFlags } from "./permissions/index.js";

// CDN
export { CDN } from "./cdn/index.js";

// Collectors
export { Collector, MessageCollector, ComponentCollector, ReactionCollector } from "./collectors/index.js";
export type { BaseCollectorOptions, CollectorOptions, ComponentCollectorOptions, ReactionCollectorOptions } from "./collectors/index.js";

// Sweepers
export { Sweepers, messageLifetimeFilter, lifetimeFilter } from "./cache/Sweepers.js";
export type { SweeperConfig, SweeperOptions, SweeperFilterFn } from "./cache/Sweepers.js";

// Webhook
export { WebhookClient } from "./webhook/index.js";
export type { WebhookMessageOptions, EditWebhookMessageOptions } from "./webhook/index.js";

// Threads (re-export for convenience)
export { ThreadPool } from "@volundr/threads";
export type { ThreadPoolOptions } from "@volundr/threads";

// Resolvers
export {
    resolveUserId,
    resolveChannelId,
    resolveGuildId,
    resolveRoleId,
    resolveEmojiId,
    resolveMessageId,
} from "./utils/Resolvers.js";
export type {
    UserResolvable,
    ChannelResolvable,
    GuildResolvable,
    RoleResolvable,
    EmojiResolvable,
    MessageResolvable,
} from "./utils/Resolvers.js";

// Locale
export { createLocaleMap, resolveLocale } from "./utils/Locale.js";
export type { LocaleMap } from "./utils/Locale.js";

// Utilities
export { SnowflakeUtil } from "./utils/SnowflakeUtil.js";
export { Formatters, fmt } from "./utils/Formatters.js";
export type { TimestampStyle } from "./utils/Formatters.js";
export { BitField } from "./utils/BitField.js";
export type { BitFieldResolvable } from "./utils/BitField.js";
export { LimitedCollection } from "./collection/LimitedCollection.js";
export type { LimitedCollectionOptions } from "./collection/LimitedCollection.js";
export { Colors } from "./utils/Colors.js";
export type { ColorResolvable } from "./utils/Colors.js";
export { validateIntentsForEvent, logIntentsSummary } from "./utils/IntentsValidator.js";
export { Partials, hasPartial } from "./utils/Partials.js";
export type { PartialType } from "./utils/Partials.js";
export { paginate, paginateAll } from "./utils/Paginator.js";
export type { PaginateOptions } from "./utils/Paginator.js";
export { UserFlags, parseUserFlags, hasUserFlag, MemberFlags, parseMemberFlags, hasMemberFlag } from "./utils/UserFlags.js";
export type { UserFlagKey, MemberFlagKey } from "./utils/UserFlags.js";
export { OAuth2 } from "./utils/OAuth2.js";
export type { OAuth2Scope, OAuth2URLOptions, TokenExchangeOptions, RefreshTokenOptions, OAuth2TokenResponse } from "./utils/OAuth2.js";

// Types
export type {
    ClientOptions,
    ClientEvents,
    CreateMessageOptions,
    EditMessageOptions,
    FetchMessagesOptions,
    BanOptions,
    EditMemberOptions,
    CreateRoleOptions,
    CreateChannelOptions,
    InteractionResponseOptions,
    ListMembersOptions,
    PruneMembersOptions,
    PruneResult,
    GuildBan,
    GetAuditLogOptions,
    RequestGuildMembersOptions,
    FetchMembersOptions,
    PermissionOverwriteData,
    GuildWidgetSettings,
    GuildVanityUrl,
} from "./types.js";
