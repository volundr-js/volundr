import type { Snowflake, Timestamp } from "./common.js";
import type { APIGuildMember } from "./member.js";

export interface APIVoiceState {
    guild_id?: Snowflake;
    channel_id: Snowflake | null;
    user_id: Snowflake;
    member?: APIGuildMember;
    session_id: string;
    deaf: boolean;
    mute: boolean;
    self_deaf: boolean;
    self_mute: boolean;
    self_stream?: boolean;
    self_video: boolean;
    suppress: boolean;
    request_to_speak_timestamp: Timestamp | null;
}
