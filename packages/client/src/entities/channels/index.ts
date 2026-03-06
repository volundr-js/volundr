import { ChannelType, type APIChannel } from "@volundr/types";
import type { Client } from "../../Client.js";
import { BaseChannel, type Channel } from "./BaseChannel.js";
import { TextChannel } from "./TextChannel.js";
import { VoiceChannel } from "./VoiceChannel.js";
import { CategoryChannel } from "./CategoryChannel.js";
import { DMChannel } from "./DMChannel.js";
import { AnnouncementChannel } from "./AnnouncementChannel.js";
import { ForumChannel } from "./ForumChannel.js";
import { StageChannel } from "./StageChannel.js";
import { ThreadChannel } from "./ThreadChannel.js";

/**
 * Create the correct Channel subclass based on channel type.
 */
export function channelFrom(client: Client, data: APIChannel): Channel {
    switch (data.type) {
        case ChannelType.GuildText:
            return new TextChannel(client, data);
        case ChannelType.DM:
        case ChannelType.GroupDM:
            return new DMChannel(client, data);
        case ChannelType.GuildVoice:
            return new VoiceChannel(client, data);
        case ChannelType.GuildCategory:
            return new CategoryChannel(client, data);
        case ChannelType.GuildAnnouncement:
            return new AnnouncementChannel(client, data);
        case ChannelType.AnnouncementThread:
        case ChannelType.PublicThread:
        case ChannelType.PrivateThread:
            return new ThreadChannel(client, data);
        case ChannelType.GuildStageVoice:
            return new StageChannel(client, data);
        case ChannelType.GuildForum:
        case ChannelType.GuildMedia:
            return new ForumChannel(client, data);
        default:
            return new BaseChannel(client, data);
    }
}

export { BaseChannel, type Channel, type TextBasedChannel, type VoiceBasedChannel } from "./BaseChannel.js";
export { GuildChannel, type EditChannelOptions } from "./GuildChannel.js";
export { TextChannel } from "./TextChannel.js";
export { VoiceChannel } from "./VoiceChannel.js";
export { CategoryChannel } from "./CategoryChannel.js";
export { DMChannel } from "./DMChannel.js";
export { AnnouncementChannel } from "./AnnouncementChannel.js";
export { ForumChannel, type CreateForumPostOptions } from "./ForumChannel.js";
export { StageChannel } from "./StageChannel.js";
export { ThreadChannel, type EditThreadOptions } from "./ThreadChannel.js";
