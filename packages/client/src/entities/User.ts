import type { APIUser, Snowflake } from "@volundr/types";
import { BaseEntity } from "./Base.js";
import { CDN } from "../cdn/CDN.js";
import type { Client } from "../Client.js";
import { Message } from "./Message.js";
import { type MessageInput, resolveMessageInput } from "../builders/InlineMessage.js";

export interface ImageURLOptions {
    size?: 16 | 32 | 64 | 128 | 256 | 512 | 1024 | 2048 | 4096;
    format?: "webp" | "png" | "jpg" | "gif";
}

export class User extends BaseEntity {
    username!: string;
    globalName!: string | null;
    discriminator!: string;
    avatar!: string | null;
    bot!: boolean;
    system!: boolean;
    banner!: string | null;
    accentColor!: number | null;
    flags!: number;
    publicFlags!: number;

    constructor(client: Client, data: APIUser) {
        super(client, data.id);
        this._patch(data);
    }

    _patch(data: Partial<APIUser>): void {
        if (data.username !== undefined) this.username = data.username;
        if (data.global_name !== undefined) this.globalName = data.global_name;
        if (data.discriminator !== undefined) this.discriminator = data.discriminator;
        if (data.avatar !== undefined) this.avatar = data.avatar;
        if (data.bot !== undefined) this.bot = data.bot;
        else if (this.bot === undefined) this.bot = false;
        if (data.system !== undefined) this.system = data.system;
        else if (this.system === undefined) this.system = false;
        if (data.banner !== undefined) this.banner = data.banner;
        else if (this.banner === undefined) this.banner = null;
        if (data.accent_color !== undefined) this.accentColor = data.accent_color ?? null;
        else if (this.accentColor === undefined) this.accentColor = null;
        if (data.flags !== undefined) this.flags = data.flags;
        else if (this.flags === undefined) this.flags = 0;
        if (data.public_flags !== undefined) this.publicFlags = data.public_flags;
        else if (this.publicFlags === undefined) this.publicFlags = 0;
    }

    /** The user's display name (global_name or username). */
    get displayName(): string {
        return this.globalName ?? this.username;
    }

    /** The user's tag (e.g. "User#1234" or just "username" for new username system). */
    get tag(): string {
        return this.discriminator === "0"
            ? this.username
            : `${this.username}#${this.discriminator}`;
    }

    /** URL of the user's avatar, or null if no custom avatar. */
    avatarURL(options?: ImageURLOptions): string | null {
        if (!this.avatar) return null;
        return CDN.avatar(this.id, this.avatar, options);
    }

    /** URL of the user's avatar, falling back to the default avatar. */
    displayAvatarURL(options?: ImageURLOptions): string {
        return this.avatarURL(options) ?? CDN.defaultAvatar(this.id);
    }

    /** URL of the user's banner, or null if none. */
    bannerURL(options?: ImageURLOptions): string | null {
        if (!this.banner) return null;
        return CDN.userBanner(this.id, this.banner, options);
    }

    /** Send a DM to this user. Accepts a string, options object, or inline message callback. */
    async send(options: MessageInput): Promise<Message> {
        const opts = resolveMessageInput(options);
        // Create DM channel first
        const dmChannel = await this.client.rest.post<{ id: Snowflake }>("/users/@me/channels", {
            body: { recipient_id: this.id },
        });
        const data = await this.client.createMessage(dmChannel.id, opts);
        return new Message(this.client, data);
    }

    /** Fetch fresh user data from the API. */
    async fetch(): Promise<User> {
        const data = await this.client.rest.get<APIUser>(`/users/${this.id}`);
        this._patch(data);
        return this;
    }

    /** Mention string for this user. */
    toString(): string {
        return `<@${this.id}>`;
    }

    toJSON(): APIUser {
        return {
            id: this.id,
            username: this.username,
            global_name: this.globalName,
            discriminator: this.discriminator,
            avatar: this.avatar,
            bot: this.bot || undefined,
            system: this.system || undefined,
            banner: this.banner,
            accent_color: this.accentColor,
            flags: this.flags,
            public_flags: this.publicFlags,
        };
    }
}
