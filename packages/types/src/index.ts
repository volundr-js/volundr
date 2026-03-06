// Common
export type { Snowflake, Timestamp, APIStickerItem } from "./common.js";

// Base interfaces (JDA-style)
export type { HasId, Mentionable, Nameable, ImageHolder } from "./base.js";

// User
export type { APIUser, APIAvatarDecorationData } from "./user.js";

// Role
export type { APIRole, APIRoleTags } from "./role.js";

// Emoji
export type { APIEmoji } from "./emoji.js";

// Channel
export { ChannelType } from "./channel.js";
export type { APIChannel, APIOverwrite, APIThreadMetadata, APIThreadMember, APIForumTag, APIDefaultReaction } from "./channel.js";

// Member
export type { APIGuildMember } from "./member.js";

// Message
export { MessageType, AllowedMentionsTypes } from "./message.js";
export type {
    APIMessage,
    APIAttachment,
    APIEmbed,
    APIEmbedField,
    APIEmbedFooter,
    APIEmbedMedia,
    APIEmbedProvider,
    APIEmbedAuthor,
    APIReaction,
    APIChannelMention,
    APIMessageActivity,
    APIMessageReference,
    APIMessageComponent,
    APIAllowedMentions,
} from "./message.js";

// Presence
export { ActivityType } from "./presence.js";
export type {
    StatusType,
    APIPresenceUpdate,
    APIActivity,
    APIActivityTimestamps,
    APIActivityEmoji,
    APIActivityParty,
    APIActivityAssets,
    APIActivitySecrets,
    APIActivityButton,
    APIClientStatus,
} from "./presence.js";

// Voice
export type { APIVoiceState } from "./voice.js";

// Guild
export type { APIGuild, GatewayGuild, APIUnavailableGuild } from "./guild.js";

// Interaction
export { InteractionType, ApplicationCommandType } from "./interaction.js";
export type {
    APIInteraction,
    APIInteractionData,
    APIApplicationCommandOption,
    APIResolvedData,
    APIEntitlement,
} from "./interaction.js";

// Components
export { ComponentType, ButtonStyle, TextInputStyle, SeparatorSpacing, MessageFlags, InteractionResponseType } from "./component.js";
export type {
    APIActionRow,
    APIButton,
    APIStringSelect,
    APISelectOption,
    APIUserSelect,
    APIRoleSelect,
    APIMentionableSelect,
    APIChannelSelect,
    APITextInput,
    APIComponent,
    APITextDisplay,
    APIThumbnail,
    APISection,
    APIMediaGallery,
    APIMediaGalleryItem,
    APIFile,
    APISeparator,
    APIContainer,
    APITopLevelComponent,
    APIModal,
    APIInteractionResponse,
    APIInteractionCallbackData,
} from "./component.js";

// Locale
export { Locale } from "./locale.js";
export type { LocaleString } from "./locale.js";

// Application Commands
export { ApplicationCommandOptionType } from "./command.js";
export type {
    APIApplicationCommand,
    APIApplicationCommandOptionData,
    APIApplicationCommandOptionChoice,
    CreateApplicationCommandData,
} from "./command.js";

// TypedEmitter
export { TypedEmitter } from "./TypedEmitter.js";

// Gateway events
export { GatewayEvent } from "./gateway.js";
export type {
    GatewayReadyData,
    GatewayMessageDeleteData,
    GatewayMessageDeleteBulkData,
    GatewayMessageReactionAddData,
    GatewayMessageReactionRemoveData,
    GatewayGuildMemberAddData,
    GatewayGuildMemberRemoveData,
    GatewayGuildMemberUpdateData,
    GatewayGuildMembersChunkData,
    GatewayGuildRoleData,
    GatewayGuildRoleDeleteData,
    GatewayGuildBanData,
    GatewayGuildEmojisUpdateData,
    GatewayChannelPinsUpdateData,
    GatewayTypingStartData,
    GatewayVoiceServerUpdateData,
    GatewayThreadListSyncData,
    GatewayThreadMemberUpdateData,
    GatewayThreadMembersUpdateData,
    GatewayGuildStickersUpdateData,
    GatewayWebhooksUpdateData,
    GatewayGuildIntegrationsUpdateData,
    GatewayInviteCreateData,
    GatewayInviteDeleteData,
    GatewayMessageReactionRemoveAllData,
    GatewayMessageReactionRemoveEmojiData,
    GatewayGuildScheduledEventUserData,
    GatewayAutoModerationActionExecutionData,
    GatewayGuildAuditLogEntryCreateData,
    GatewayMessagePollVoteData,
    GatewayEvents,
} from "./gateway.js";

// Audit Log
export { AuditLogEvent } from "./audit-log.js";
export type {
    APIAuditLog,
    APIAuditLogEntry,
    APIAuditLogChange,
    APIAuditLogEntryOptions,
} from "./audit-log.js";

// Invite
export { InviteTargetType } from "./invite.js";
export type {
    APIInvite,
    APIInviteMetadata,
    CreateInviteOptions,
} from "./invite.js";

// Auto Moderation
export {
    AutoModerationEventType,
    AutoModerationTriggerType,
    AutoModerationKeywordPresetType,
    AutoModerationActionType,
} from "./auto-moderation.js";
export type {
    APIAutoModerationRule,
    APIAutoModerationAction,
    APIAutoModerationActionMetadata,
    APIAutoModerationTriggerMetadata,
} from "./auto-moderation.js";

// Scheduled Event
export {
    GuildScheduledEventPrivacyLevel,
    GuildScheduledEventEntityType,
    GuildScheduledEventStatus,
} from "./scheduled-event.js";
export type {
    APIGuildScheduledEvent,
    APIGuildScheduledEventUser,
    APIGuildScheduledEventEntityMetadata,
} from "./scheduled-event.js";

// Stage Instance
export { StageInstancePrivacyLevel } from "./stage-instance.js";
export type { APIStageInstance } from "./stage-instance.js";

// Webhook
export { WebhookType } from "./webhook.js";
export type {
    APIWebhook,
    CreateWebhookOptions,
    EditWebhookOptions,
} from "./webhook.js";

// Sticker
export { StickerType, StickerFormatType } from "./sticker.js";
export type { APISticker } from "./sticker.js";

// Template
export type { APIGuildTemplate } from "./template.js";
