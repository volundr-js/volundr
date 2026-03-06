import type { APIEmoji, Snowflake } from "@volundr/types";
import { BaseEntity } from "./Base.js";
import { CDN } from "../cdn/CDN.js";
import type { Client } from "../Client.js";
import type { Guild } from "./Guild.js";

export class GuildEmoji extends BaseEntity {
    guildId: Snowflake;
    name!: string | null;
    animated!: boolean;
    managed!: boolean;
    available!: boolean;
    requireColons!: boolean;
    roleIds!: Snowflake[];

    constructor(client: Client, data: APIEmoji, guildId: Snowflake) {
        if (!data.id) throw new Error("GuildEmoji requires a non-null id (unicode emojis are not supported)");
        super(client, data.id);
        this.guildId = guildId;
        this._patch(data);
    }

    _patch(data: Partial<APIEmoji>): void {
        if (data.name !== undefined) this.name = data.name;
        if (data.animated !== undefined) this.animated = data.animated;
        else if (this.animated === undefined) this.animated = false;
        if (data.managed !== undefined) this.managed = data.managed;
        else if (this.managed === undefined) this.managed = false;
        if (data.available !== undefined) this.available = data.available;
        else if (this.available === undefined) this.available = true;
        if (data.require_colons !== undefined) this.requireColons = data.require_colons;
        else if (this.requireColons === undefined) this.requireColons = true;
        if (data.roles !== undefined) this.roleIds = data.roles;
        else if (this.roleIds === undefined) this.roleIds = [];
    }

    /** The guild this emoji belongs to. */
    get guild(): Guild | undefined {
        return this.client.guilds.get(this.guildId);
    }

    /** URL of this emoji. */
    imageURL(options?: { size?: number }): string {
        return CDN.emoji(this.id, this.animated, options as never);
    }

    /** Edit this emoji. */
    async edit(data: { name?: string; roles?: Snowflake[] | null }, reason?: string): Promise<GuildEmoji> {
        const result = await this.client.rest.patch<APIEmoji>(
            `/guilds/${this.guildId}/emojis/${this.id}`,
            { body: data, reason },
        );
        this._patch(result);
        return this;
    }

    /** Delete this emoji. */
    async delete(reason?: string): Promise<void> {
        await this.client.rest.delete(`/guilds/${this.guildId}/emojis/${this.id}`, { reason });
    }

    /** Set the emoji name. */
    setName(name: string, reason?: string): Promise<GuildEmoji> {
        return this.edit({ name }, reason);
    }

    /** The identifier used in message content (e.g. `<:name:id>` or `<a:name:id>`). */
    toString(): string {
        return this.animated
            ? `<a:${this.name}:${this.id}>`
            : `<:${this.name}:${this.id}>`;
    }

    toJSON(): APIEmoji {
        return {
            id: this.id,
            name: this.name,
            animated: this.animated,
            managed: this.managed,
            available: this.available,
            require_colons: this.requireColons,
            roles: this.roleIds,
        };
    }
}
