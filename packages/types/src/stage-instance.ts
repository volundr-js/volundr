import type { Snowflake } from "./common.js";

export enum StageInstancePrivacyLevel {
    GuildOnly = 2,
}

export interface APIStageInstance {
    id: Snowflake;
    guild_id: Snowflake;
    channel_id: Snowflake;
    topic: string;
    privacy_level: StageInstancePrivacyLevel;
    discoverable_disabled: boolean;
    guild_scheduled_event_id: Snowflake | null;
}
