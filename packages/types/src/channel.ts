import type { Snowflake, Timestamp } from "./common.js";
import type { HasId } from "./base.js";
import type { APIUser } from "./user.js";

export enum ChannelType {
    GuildText = 0,
    DM = 1,
    GuildVoice = 2,
    GroupDM = 3,
    GuildCategory = 4,
    GuildAnnouncement = 5,
    AnnouncementThread = 10,
    PublicThread = 11,
    PrivateThread = 12,
    GuildStageVoice = 13,
    GuildDirectory = 14,
    GuildForum = 15,
    GuildMedia = 16,
}

export interface APIChannel extends HasId {
    id: Snowflake;
    type: ChannelType;
    name?: string | null;
    guild_id?: Snowflake;
    position?: number;
    permission_overwrites?: APIOverwrite[];
    topic?: string | null;
    nsfw?: boolean;
    last_message_id?: Snowflake | null;
    bitrate?: number;
    user_limit?: number;
    rate_limit_per_user?: number;
    recipients?: APIUser[];
    icon?: string | null;
    owner_id?: Snowflake;
    parent_id?: Snowflake | null;
    last_pin_timestamp?: Timestamp | null;
    thread_metadata?: APIThreadMetadata;
    member?: APIThreadMember;
    default_auto_archive_duration?: number;
    permissions?: string;
    flags?: number;
    total_message_sent?: number;
    available_tags?: APIForumTag[];
    default_reaction_emoji?: APIDefaultReaction | null;
    default_sort_order?: number | null;
    default_forum_layout?: number;
}

export interface APIOverwrite {
    id: Snowflake;
    type: number;
    allow: string;
    deny: string;
}

export interface APIThreadMetadata {
    archived: boolean;
    auto_archive_duration: number;
    archive_timestamp: Timestamp;
    locked: boolean;
    invitable?: boolean;
    create_timestamp?: Timestamp | null;
}

export interface APIThreadMember {
    id?: Snowflake;
    user_id?: Snowflake;
    join_timestamp: Timestamp;
    flags: number;
}

export interface APIForumTag {
    id: Snowflake;
    name: string;
    moderated: boolean;
    emoji_id: Snowflake | null;
    emoji_name: string | null;
}

export interface APIDefaultReaction {
    emoji_id: Snowflake | null;
    emoji_name: string | null;
}
