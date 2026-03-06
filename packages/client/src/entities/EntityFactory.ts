import type {
    APIUser, APIRole, APIGuildMember, APIChannel, APIMessage,
    APIInteraction, APIVoiceState, APIPresenceUpdate, APIEmoji,
    APIGuild, GatewayGuild, Snowflake,
} from "@volundr/types";
import type { Client } from "../Client.js";
import { User } from "./User.js";
import { Role } from "./Role.js";
import { GuildMember } from "./GuildMember.js";
import { Guild } from "./Guild.js";
import { Message } from "./Message.js";
import { GuildEmoji } from "./GuildEmoji.js";
import { VoiceState } from "./VoiceState.js";
import { Presence } from "./Presence.js";
import { channelFrom, type Channel, GuildChannel } from "./channels/index.js";
import { interactionFrom, type Interaction } from "./interactions/index.js";

/**
 * Central factory for creating/updating entity instances from raw API data.
 * Handles caching: reuses existing entities when possible, patches them with new data.
 */
export class EntityFactory {
    private readonly client: Client;

    constructor(client: Client) {
        this.client = client;
    }

    /** Get or create a User entity. */
    createUser(data: APIUser): User {
        let user = this.client.users.get(data.id);
        if (user) {
            user._patch(data);
        } else {
            user = new User(this.client, data);
            this.client.users.set(data.id, user);
        }
        return user;
    }

    /** Get or create a Guild entity from GUILD_CREATE payload. */
    createGuild(data: GatewayGuild | APIGuild): Guild {
        let guild = this.client.guilds.get(data.id);
        if (guild) {
            guild._patch(data);
        } else {
            guild = new Guild(this.client, data);
            this.client.guilds.set(data.id, guild);
        }

        // Guild._patch already registers channels/users in flat client caches inline
        return guild;
    }

    /** Get or create a Channel entity. */
    createChannel(data: APIChannel): Channel {
        let channel = this.client.channels.get(data.id);
        if (channel) {
            channel._patch(data);
        } else {
            channel = channelFrom(this.client, data);
            this.client.channels.set(data.id, channel);
        }

        // Also add to guild's channel collection if guild channel
        if (channel instanceof GuildChannel && channel.guildId) {
            const guild = this.client.guilds.get(channel.guildId);
            guild?.channels.set(data.id, channel);
        }

        return channel;
    }

    /** Get or create a Role entity. */
    createRole(data: APIRole, guildId: Snowflake): Role {
        const guild = this.client.guilds.get(guildId);
        let role = guild?.roles.get(data.id);
        if (role) {
            role._patch(data);
        } else {
            role = new Role(this.client, data, guildId);
            guild?.roles.set(data.id, role);
        }
        return role;
    }

    /** Get or create a GuildMember entity. */
    createMember(data: APIGuildMember, guildId: Snowflake): GuildMember {
        const userId = data.user?.id;
        if (!userId) throw new Error("Member data missing user");

        const user = this.createUser(data.user!);
        const guild = this.client.guilds.get(guildId);

        let member = guild?.members.get(userId);
        if (member) {
            member._patch(data);
            member.user = user;
        } else {
            member = new GuildMember(this.client, data, guildId, userId);
            member.user = user;
            guild?.members.set(userId, member);
        }
        return member;
    }

    /** Get or create a Message entity. */
    createMessage(data: APIMessage): Message {
        const message = new Message(this.client, data);

        // Resolve author
        if (data.author) {
            message.author = this.createUser(data.author);
        }

        // Resolve member - set user field directly to avoid spread allocation
        if (data.member && data.guild_id) {
            if (!data.member.user) {
                (data.member as APIGuildMember).user = data.author;
            }
            message.member = this.createMember(data.member, data.guild_id);
        } else {
            message.member = null;
        }

        return message;
    }

    /** Create an Interaction entity. */
    createInteraction(data: APIInteraction): Interaction {
        const interaction = interactionFrom(this.client, data);

        // Resolve user
        const userData = data.member?.user ?? data.user;
        if (userData) {
            interaction.user = this.createUser(userData);
        }

        // Resolve member - pass directly to avoid spread allocation
        if (data.member && data.guild_id) {
            interaction.member = this.createMember(data.member, data.guild_id);
        } else {
            interaction.member = null;
        }

        return interaction;
    }

    /** Get or create a VoiceState entity. */
    createVoiceState(data: APIVoiceState): VoiceState {
        const guildId = data.guild_id;
        if (!guildId) return new VoiceState(this.client, data);

        const guild = this.client.guilds.get(guildId);

        let vs = guild?.voiceStates.get(data.user_id);
        if (vs) {
            vs._patch(data);
        } else {
            vs = new VoiceState(this.client, data);
            guild?.voiceStates.set(data.user_id, vs);
        }

        // Also cache the member if present
        if (data.member && guildId) {
            this.createMember(data.member, guildId);
        }

        return vs;
    }

    /** Get or create a Presence entity. */
    createPresence(data: APIPresenceUpdate): Presence {
        const guild = this.client.guilds.get(data.guild_id);
        let presence = guild?.presences.get(data.user.id);
        if (presence) {
            presence._patch(data);
        } else {
            presence = new Presence(this.client, data);
            guild?.presences.set(data.user.id, presence);
        }
        return presence;
    }

    /** Create GuildEmoji entities for a guild. */
    createEmojis(emojis: APIEmoji[], guildId: Snowflake): void {
        const guild = this.client.guilds.get(guildId);
        if (!guild) return;

        // We don't have a dedicated emoji collection on Guild yet,
        // but we can add emojis if the guild entity exposes them
        // For now, this is handled inline in Guild._patch
    }
}
