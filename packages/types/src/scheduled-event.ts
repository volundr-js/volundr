import type { Snowflake } from "./common.js";
import type { APIUser } from "./user.js";
import type { APIGuildMember } from "./member.js";

export enum GuildScheduledEventPrivacyLevel {
    GuildOnly = 2,
}

export enum GuildScheduledEventEntityType {
    StageInstance = 1,
    Voice = 2,
    External = 3,
}

export enum GuildScheduledEventStatus {
    Scheduled = 1,
    Active = 2,
    Completed = 3,
    Canceled = 4,
}

export interface APIGuildScheduledEventEntityMetadata {
    location?: string;
}

export interface APIGuildScheduledEvent {
    id: Snowflake;
    guild_id: Snowflake;
    channel_id: Snowflake | null;
    creator_id?: Snowflake | null;
    name: string;
    description?: string | null;
    scheduled_start_time: string;
    scheduled_end_time: string | null;
    privacy_level: GuildScheduledEventPrivacyLevel;
    status: GuildScheduledEventStatus;
    entity_type: GuildScheduledEventEntityType;
    entity_id: Snowflake | null;
    entity_metadata: APIGuildScheduledEventEntityMetadata | null;
    creator?: APIUser;
    user_count?: number;
    image?: string | null;
}

export interface APIGuildScheduledEventUser {
    guild_scheduled_event_id: Snowflake;
    user: APIUser;
    member?: APIGuildMember;
}
