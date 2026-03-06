import type { Snowflake } from "./common.js";

export enum AutoModerationEventType {
    MessageSend = 1,
}

export enum AutoModerationTriggerType {
    Keyword = 1,
    Spam = 3,
    KeywordPreset = 4,
    MentionSpam = 5,
}

export enum AutoModerationKeywordPresetType {
    Profanity = 1,
    SexualContent = 2,
    Slurs = 3,
}

export enum AutoModerationActionType {
    BlockMessage = 1,
    SendAlertMessage = 2,
    Timeout = 3,
}

export interface APIAutoModerationTriggerMetadata {
    keyword_filter?: string[];
    regex_patterns?: string[];
    presets?: AutoModerationKeywordPresetType[];
    allow_list?: string[];
    mention_total_limit?: number;
    mention_raid_protection_enabled?: boolean;
}

export interface APIAutoModerationActionMetadata {
    channel_id?: Snowflake;
    duration_seconds?: number;
    custom_message?: string;
}

export interface APIAutoModerationAction {
    type: AutoModerationActionType;
    metadata?: APIAutoModerationActionMetadata;
}

export interface APIAutoModerationRule {
    id: Snowflake;
    guild_id: Snowflake;
    name: string;
    creator_id: Snowflake;
    event_type: AutoModerationEventType;
    trigger_type: AutoModerationTriggerType;
    trigger_metadata: APIAutoModerationTriggerMetadata;
    actions: APIAutoModerationAction[];
    enabled: boolean;
    exempt_roles: Snowflake[];
    exempt_channels: Snowflake[];
}
