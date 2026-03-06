import type { APIUser, APIChannel, APIGuild, APIRole, Snowflake } from "@volundr/types";
import type { User } from "../entities/User.js";
import type { GuildMember } from "../entities/GuildMember.js";
import type { Channel } from "../entities/channels/index.js";
import type { Guild } from "../entities/Guild.js";
import type { Role } from "../entities/Role.js";
import type { GuildEmoji } from "../entities/GuildEmoji.js";
import type { Message } from "../entities/Message.js";

// ── Resolvable Types ────────────────────────────────────────────

export type UserResolvable = User | GuildMember | Message | Snowflake | APIUser;
export type ChannelResolvable = Channel | Snowflake | APIChannel;
export type GuildResolvable = Guild | Snowflake | APIGuild;
export type RoleResolvable = Role | Snowflake | APIRole;
export type EmojiResolvable = GuildEmoji | string; // string = unicode or <:name:id>
export type MessageResolvable = Message | Snowflake;

// ── Resolver Functions ──────────────────────────────────────────

function hasId(value: unknown): value is { id: Snowflake } {
    return typeof value === "object" && value !== null && "id" in value;
}

function hasUser(value: unknown): value is { user: { id: Snowflake } } {
    return typeof value === "object" && value !== null && "user" in value &&
        typeof (value as Record<string, unknown>).user === "object";
}

function hasAuthor(value: unknown): value is { author: { id: Snowflake } } {
    return typeof value === "object" && value !== null && "author" in value &&
        typeof (value as Record<string, unknown>).author === "object";
}

export function resolveUserId(resolvable: UserResolvable): Snowflake {
    if (typeof resolvable === "string") return resolvable;
    if (hasAuthor(resolvable)) return resolvable.author.id; // Message
    if (hasUser(resolvable)) return resolvable.user.id; // GuildMember
    if (hasId(resolvable)) return resolvable.id;
    throw new TypeError(`Cannot resolve user ID from: ${resolvable}`);
}

export function resolveChannelId(resolvable: ChannelResolvable): Snowflake {
    if (typeof resolvable === "string") return resolvable;
    if (hasId(resolvable)) return resolvable.id;
    throw new TypeError(`Cannot resolve channel ID from: ${resolvable}`);
}

export function resolveGuildId(resolvable: GuildResolvable): Snowflake {
    if (typeof resolvable === "string") return resolvable;
    if (hasId(resolvable)) return resolvable.id;
    throw new TypeError(`Cannot resolve guild ID from: ${resolvable}`);
}

export function resolveRoleId(resolvable: RoleResolvable): Snowflake {
    if (typeof resolvable === "string") return resolvable;
    if (hasId(resolvable)) return resolvable.id;
    throw new TypeError(`Cannot resolve role ID from: ${resolvable}`);
}

export function resolveEmojiId(resolvable: EmojiResolvable): Snowflake {
    if (typeof resolvable === "string") {
        const match = resolvable.match(/^<a?:\w+:(\d+)>$/);
        if (match) return match[1];
        return resolvable;
    }
    if (hasId(resolvable)) return resolvable.id;
    throw new TypeError(`Cannot resolve emoji ID from: ${resolvable}`);
}

export function resolveMessageId(resolvable: MessageResolvable): Snowflake {
    if (typeof resolvable === "string") return resolvable;
    if (hasId(resolvable)) return resolvable.id;
    throw new TypeError(`Cannot resolve message ID from: ${resolvable}`);
}
