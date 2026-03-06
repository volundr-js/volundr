import type { Snowflake } from "./common.js";
import type { APIChannel, APIThreadMember } from "./channel.js";
import type { APIGuild, GatewayGuild, APIUnavailableGuild } from "./guild.js";
import type { APIGuildMember } from "./member.js";
import type { APIMessage } from "./message.js";
import type { APIPresenceUpdate } from "./presence.js";
import type { APIRole } from "./role.js";
import type { APIUser } from "./user.js";
import type { APIVoiceState } from "./voice.js";
import type { APIInteraction } from "./interaction.js";
import type { APIEmoji } from "./emoji.js";
import type { APISticker } from "./sticker.js";
import type { APIStageInstance } from "./stage-instance.js";
import type { APIGuildScheduledEvent } from "./scheduled-event.js";
import type { APIAutoModerationRule, APIAutoModerationAction, AutoModerationTriggerType } from "./auto-moderation.js";
import type { APIAuditLogEntry } from "./audit-log.js";

export interface GatewayReadyData {
    v: number;
    user: APIUser;
    guilds: APIUnavailableGuild[];
    session_id: string;
    resume_gateway_url: string;
    application: { id: Snowflake; flags: number };
}

export interface GatewayMessageDeleteData {
    id: Snowflake;
    channel_id: Snowflake;
    guild_id?: Snowflake;
}

export interface GatewayMessageDeleteBulkData {
    ids: Snowflake[];
    channel_id: Snowflake;
    guild_id?: Snowflake;
}

export interface GatewayMessageReactionAddData {
    user_id: Snowflake;
    channel_id: Snowflake;
    message_id: Snowflake;
    guild_id?: Snowflake;
    member?: APIGuildMember;
    emoji: APIEmoji;
    message_author_id?: Snowflake;
}

export interface GatewayMessageReactionRemoveData {
    user_id: Snowflake;
    channel_id: Snowflake;
    message_id: Snowflake;
    guild_id?: Snowflake;
    emoji: APIEmoji;
}

export interface GatewayGuildMemberAddData extends APIGuildMember {
    guild_id: Snowflake;
}

export interface GatewayGuildMemberRemoveData {
    guild_id: Snowflake;
    user: APIUser;
}

export interface GatewayGuildMemberUpdateData {
    guild_id: Snowflake;
    roles: Snowflake[];
    user: APIUser;
    nick?: string | null;
    avatar?: string | null;
    joined_at: string | null;
    premium_since?: string | null;
    deaf?: boolean;
    mute?: boolean;
    pending?: boolean;
    communication_disabled_until?: string | null;
    flags?: number;
}

export interface GatewayGuildMembersChunkData {
    guild_id: Snowflake;
    members: APIGuildMember[];
    chunk_index: number;
    chunk_count: number;
    not_found?: Snowflake[];
    presences?: APIPresenceUpdate[];
    nonce?: string;
}

export interface GatewayGuildRoleData {
    guild_id: Snowflake;
    role: APIRole;
}

export interface GatewayGuildRoleDeleteData {
    guild_id: Snowflake;
    role_id: Snowflake;
}

export interface GatewayGuildBanData {
    guild_id: Snowflake;
    user: APIUser;
}

export interface GatewayGuildEmojisUpdateData {
    guild_id: Snowflake;
    emojis: APIEmoji[];
}

export interface GatewayChannelPinsUpdateData {
    guild_id?: Snowflake;
    channel_id: Snowflake;
    last_pin_timestamp?: string | null;
}

export interface GatewayTypingStartData {
    channel_id: Snowflake;
    guild_id?: Snowflake;
    user_id: Snowflake;
    timestamp: number;
    member?: APIGuildMember;
}

export interface GatewayVoiceServerUpdateData {
    token: string;
    guild_id: Snowflake;
    endpoint: string | null;
}

// --- Thread events ---

export interface GatewayThreadListSyncData {
    guild_id: Snowflake;
    channel_ids?: Snowflake[];
    threads: APIChannel[];
    members: APIThreadMember[];
}

export interface GatewayThreadMemberUpdateData extends APIThreadMember {
    guild_id: Snowflake;
}

export interface GatewayThreadMembersUpdateData {
    id: Snowflake;
    guild_id: Snowflake;
    member_count: number;
    added_members?: APIThreadMember[];
    removed_member_ids?: Snowflake[];
}

// --- Stickers / Webhooks / Integrations ---

export interface GatewayGuildStickersUpdateData {
    guild_id: Snowflake;
    stickers: APISticker[];
}

export interface GatewayWebhooksUpdateData {
    guild_id: Snowflake;
    channel_id: Snowflake;
}

export interface GatewayGuildIntegrationsUpdateData {
    guild_id: Snowflake;
}

// --- Invite events ---

export interface GatewayInviteCreateData {
    channel_id: Snowflake;
    code: string;
    created_at: string;
    guild_id?: Snowflake;
    inviter?: APIUser;
    max_age: number;
    max_uses: number;
    target_type?: number;
    target_user?: APIUser;
    temporary: boolean;
    uses: number;
}

export interface GatewayInviteDeleteData {
    channel_id: Snowflake;
    guild_id?: Snowflake;
    code: string;
}

// --- Reaction removal events ---

export interface GatewayMessageReactionRemoveAllData {
    channel_id: Snowflake;
    message_id: Snowflake;
    guild_id?: Snowflake;
}

export interface GatewayMessageReactionRemoveEmojiData {
    channel_id: Snowflake;
    guild_id?: Snowflake;
    message_id: Snowflake;
    emoji: APIEmoji;
}

// --- Scheduled Event users ---

export interface GatewayGuildScheduledEventUserData {
    guild_scheduled_event_id: Snowflake;
    user_id: Snowflake;
    guild_id: Snowflake;
}

// --- Auto Moderation ---

export interface GatewayAutoModerationActionExecutionData {
    guild_id: Snowflake;
    action: APIAutoModerationAction;
    rule_id: Snowflake;
    rule_trigger_type: AutoModerationTriggerType;
    user_id: Snowflake;
    channel_id?: Snowflake;
    message_id?: Snowflake;
    alert_system_message_id?: Snowflake;
    content?: string;
    matched_keyword?: string | null;
    matched_content?: string | null;
}

// --- Audit Log ---

export interface GatewayGuildAuditLogEntryCreateData extends APIAuditLogEntry {
    guild_id: Snowflake;
}

// --- Polls ---

export interface GatewayMessagePollVoteData {
    user_id: Snowflake;
    channel_id: Snowflake;
    message_id: Snowflake;
    guild_id?: Snowflake;
    answer_id: number;
}

export enum GatewayEvent {
    Ready = "READY",
    Resumed = "RESUMED",
    ChannelCreate = "CHANNEL_CREATE",
    ChannelUpdate = "CHANNEL_UPDATE",
    ChannelDelete = "CHANNEL_DELETE",
    ChannelPinsUpdate = "CHANNEL_PINS_UPDATE",
    GuildCreate = "GUILD_CREATE",
    GuildUpdate = "GUILD_UPDATE",
    GuildDelete = "GUILD_DELETE",
    GuildBanAdd = "GUILD_BAN_ADD",
    GuildBanRemove = "GUILD_BAN_REMOVE",
    GuildEmojisUpdate = "GUILD_EMOJIS_UPDATE",
    GuildMemberAdd = "GUILD_MEMBER_ADD",
    GuildMemberRemove = "GUILD_MEMBER_REMOVE",
    GuildMemberUpdate = "GUILD_MEMBER_UPDATE",
    GuildMembersChunk = "GUILD_MEMBERS_CHUNK",
    GuildRoleCreate = "GUILD_ROLE_CREATE",
    GuildRoleUpdate = "GUILD_ROLE_UPDATE",
    GuildRoleDelete = "GUILD_ROLE_DELETE",
    MessageCreate = "MESSAGE_CREATE",
    MessageUpdate = "MESSAGE_UPDATE",
    MessageDelete = "MESSAGE_DELETE",
    MessageDeleteBulk = "MESSAGE_DELETE_BULK",
    MessageReactionAdd = "MESSAGE_REACTION_ADD",
    MessageReactionRemove = "MESSAGE_REACTION_REMOVE",
    PresenceUpdate = "PRESENCE_UPDATE",
    TypingStart = "TYPING_START",
    UserUpdate = "USER_UPDATE",
    VoiceStateUpdate = "VOICE_STATE_UPDATE",
    VoiceServerUpdate = "VOICE_SERVER_UPDATE",
    InteractionCreate = "INTERACTION_CREATE",

    // Thread events
    ThreadCreate = "THREAD_CREATE",
    ThreadUpdate = "THREAD_UPDATE",
    ThreadDelete = "THREAD_DELETE",
    ThreadListSync = "THREAD_LIST_SYNC",
    ThreadMemberUpdate = "THREAD_MEMBER_UPDATE",
    ThreadMembersUpdate = "THREAD_MEMBERS_UPDATE",

    // Stage events
    StageInstanceCreate = "STAGE_INSTANCE_CREATE",
    StageInstanceUpdate = "STAGE_INSTANCE_UPDATE",
    StageInstanceDelete = "STAGE_INSTANCE_DELETE",

    // Scheduled events
    GuildScheduledEventCreate = "GUILD_SCHEDULED_EVENT_CREATE",
    GuildScheduledEventUpdate = "GUILD_SCHEDULED_EVENT_UPDATE",
    GuildScheduledEventDelete = "GUILD_SCHEDULED_EVENT_DELETE",
    GuildScheduledEventUserAdd = "GUILD_SCHEDULED_EVENT_USER_ADD",
    GuildScheduledEventUserRemove = "GUILD_SCHEDULED_EVENT_USER_REMOVE",

    // Auto Moderation
    AutoModerationRuleCreate = "AUTO_MODERATION_RULE_CREATE",
    AutoModerationRuleUpdate = "AUTO_MODERATION_RULE_UPDATE",
    AutoModerationRuleDelete = "AUTO_MODERATION_RULE_DELETE",
    AutoModerationActionExecution = "AUTO_MODERATION_ACTION_EXECUTION",

    // Invites
    InviteCreate = "INVITE_CREATE",
    InviteDelete = "INVITE_DELETE",

    // Reactions (additional)
    MessageReactionRemoveAll = "MESSAGE_REACTION_REMOVE_ALL",
    MessageReactionRemoveEmoji = "MESSAGE_REACTION_REMOVE_EMOJI",

    // Misc
    GuildStickersUpdate = "GUILD_STICKERS_UPDATE",
    WebhooksUpdate = "WEBHOOKS_UPDATE",
    GuildIntegrationsUpdate = "GUILD_INTEGRATIONS_UPDATE",

    // Audit Log
    GuildAuditLogEntryCreate = "GUILD_AUDIT_LOG_ENTRY_CREATE",

    // Polls
    MessagePollVoteAdd = "MESSAGE_POLL_VOTE_ADD",
    MessagePollVoteRemove = "MESSAGE_POLL_VOTE_REMOVE",
}

export interface GatewayEvents {
    READY: GatewayReadyData;
    RESUMED: void;

    CHANNEL_CREATE: APIChannel;
    CHANNEL_UPDATE: APIChannel;
    CHANNEL_DELETE: APIChannel;
    CHANNEL_PINS_UPDATE: GatewayChannelPinsUpdateData;

    GUILD_CREATE: GatewayGuild;
    GUILD_UPDATE: APIGuild;
    GUILD_DELETE: APIUnavailableGuild;
    GUILD_BAN_ADD: GatewayGuildBanData;
    GUILD_BAN_REMOVE: GatewayGuildBanData;
    GUILD_EMOJIS_UPDATE: GatewayGuildEmojisUpdateData;

    GUILD_MEMBER_ADD: GatewayGuildMemberAddData;
    GUILD_MEMBER_REMOVE: GatewayGuildMemberRemoveData;
    GUILD_MEMBER_UPDATE: GatewayGuildMemberUpdateData;
    GUILD_MEMBERS_CHUNK: GatewayGuildMembersChunkData;

    GUILD_ROLE_CREATE: GatewayGuildRoleData;
    GUILD_ROLE_UPDATE: GatewayGuildRoleData;
    GUILD_ROLE_DELETE: GatewayGuildRoleDeleteData;

    MESSAGE_CREATE: APIMessage;
    MESSAGE_UPDATE: Partial<APIMessage> & { id: Snowflake; channel_id: Snowflake };
    MESSAGE_DELETE: GatewayMessageDeleteData;
    MESSAGE_DELETE_BULK: GatewayMessageDeleteBulkData;

    MESSAGE_REACTION_ADD: GatewayMessageReactionAddData;
    MESSAGE_REACTION_REMOVE: GatewayMessageReactionRemoveData;

    PRESENCE_UPDATE: APIPresenceUpdate;
    TYPING_START: GatewayTypingStartData;

    USER_UPDATE: APIUser;

    VOICE_STATE_UPDATE: APIVoiceState;
    VOICE_SERVER_UPDATE: GatewayVoiceServerUpdateData;

    INTERACTION_CREATE: APIInteraction;

    // Thread events
    THREAD_CREATE: APIChannel;
    THREAD_UPDATE: APIChannel;
    THREAD_DELETE: APIChannel;
    THREAD_LIST_SYNC: GatewayThreadListSyncData;
    THREAD_MEMBER_UPDATE: GatewayThreadMemberUpdateData;
    THREAD_MEMBERS_UPDATE: GatewayThreadMembersUpdateData;

    // Stage events
    STAGE_INSTANCE_CREATE: APIStageInstance;
    STAGE_INSTANCE_UPDATE: APIStageInstance;
    STAGE_INSTANCE_DELETE: APIStageInstance;

    // Scheduled events
    GUILD_SCHEDULED_EVENT_CREATE: APIGuildScheduledEvent;
    GUILD_SCHEDULED_EVENT_UPDATE: APIGuildScheduledEvent;
    GUILD_SCHEDULED_EVENT_DELETE: APIGuildScheduledEvent;
    GUILD_SCHEDULED_EVENT_USER_ADD: GatewayGuildScheduledEventUserData;
    GUILD_SCHEDULED_EVENT_USER_REMOVE: GatewayGuildScheduledEventUserData;

    // Auto Moderation
    AUTO_MODERATION_RULE_CREATE: APIAutoModerationRule;
    AUTO_MODERATION_RULE_UPDATE: APIAutoModerationRule;
    AUTO_MODERATION_RULE_DELETE: APIAutoModerationRule;
    AUTO_MODERATION_ACTION_EXECUTION: GatewayAutoModerationActionExecutionData;

    // Invites
    INVITE_CREATE: GatewayInviteCreateData;
    INVITE_DELETE: GatewayInviteDeleteData;

    // Reactions (additional)
    MESSAGE_REACTION_REMOVE_ALL: GatewayMessageReactionRemoveAllData;
    MESSAGE_REACTION_REMOVE_EMOJI: GatewayMessageReactionRemoveEmojiData;

    // Misc
    GUILD_STICKERS_UPDATE: GatewayGuildStickersUpdateData;
    WEBHOOKS_UPDATE: GatewayWebhooksUpdateData;
    GUILD_INTEGRATIONS_UPDATE: GatewayGuildIntegrationsUpdateData;

    // Audit Log
    GUILD_AUDIT_LOG_ENTRY_CREATE: GatewayGuildAuditLogEntryCreateData;

    // Polls
    MESSAGE_POLL_VOTE_ADD: GatewayMessagePollVoteData;
    MESSAGE_POLL_VOTE_REMOVE: GatewayMessagePollVoteData;
}
