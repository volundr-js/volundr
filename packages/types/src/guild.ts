import type { Snowflake, Timestamp, APIStickerItem } from "./common.js";
import type { HasId, Nameable, ImageHolder } from "./base.js";
import type { APIChannel } from "./channel.js";
import type { APIEmoji } from "./emoji.js";
import type { APIGuildMember } from "./member.js";
import type { APIPresenceUpdate } from "./presence.js";
import type { APIRole } from "./role.js";
import type { APIVoiceState } from "./voice.js";

export interface APIGuild extends HasId, Nameable, ImageHolder {
    id: Snowflake;
    name: string;
    icon: string | null;
    icon_hash?: string | null;
    splash: string | null;
    discovery_splash: string | null;
    owner?: boolean;
    owner_id: Snowflake;
    permissions?: string;
    afk_channel_id: Snowflake | null;
    afk_timeout: number;
    widget_enabled?: boolean;
    widget_channel_id?: Snowflake | null;
    verification_level: number;
    default_message_notifications: number;
    explicit_content_filter: number;
    roles: APIRole[];
    emojis: APIEmoji[];
    features: string[];
    mfa_level: number;
    application_id: Snowflake | null;
    system_channel_id: Snowflake | null;
    system_channel_flags: number;
    rules_channel_id: Snowflake | null;
    max_presences?: number | null;
    max_members?: number;
    vanity_url_code: string | null;
    description: string | null;
    banner: string | null;
    premium_tier: number;
    premium_subscription_count?: number;
    preferred_locale: string;
    public_updates_channel_id: Snowflake | null;
    max_video_channel_users?: number;
    max_stage_video_channel_users?: number;
    approximate_member_count?: number;
    approximate_presence_count?: number;
    nsfw_level: number;
    stickers?: APIStickerItem[];
    premium_progress_bar_enabled: boolean;
    safety_alerts_channel_id: Snowflake | null;
}

export interface GatewayGuild extends APIGuild {
    joined_at: Timestamp;
    large: boolean;
    unavailable?: boolean;
    member_count: number;
    voice_states: APIVoiceState[];
    members: APIGuildMember[];
    channels: APIChannel[];
    threads: APIChannel[];
    presences: APIPresenceUpdate[];
}

export interface APIUnavailableGuild {
    id: Snowflake;
    unavailable: true;
}
