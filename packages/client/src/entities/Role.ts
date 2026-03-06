import type { APIRole, APIRoleTags, Snowflake } from "@volundr/types";
import { BaseEntity } from "./Base.js";
import { Permissions } from "../permissions/Permissions.js";
import type { Client } from "../Client.js";
import type { Guild } from "./Guild.js";

export interface EditRoleOptions {
    name?: string;
    color?: number;
    permissions?: string | bigint;
    hoist?: boolean;
    mentionable?: boolean;
    icon?: string | null;
    unicode_emoji?: string | null;
}

export class Role extends BaseEntity {
    guildId: Snowflake;
    name!: string;
    color!: number;
    hoist!: boolean;
    icon!: string | null;
    unicodeEmoji!: string | null;
    position!: number;
    permissions!: Permissions;
    managed!: boolean;
    mentionable!: boolean;
    tags!: APIRoleTags | undefined;
    flags!: number;

    constructor(client: Client, data: APIRole, guildId: Snowflake) {
        super(client, data.id);
        this.guildId = guildId;
        this._patch(data);
    }

    _patch(data: Partial<APIRole>): void {
        if (data.name !== undefined) this.name = data.name;
        if (data.color !== undefined) this.color = data.color;
        if (data.hoist !== undefined) this.hoist = data.hoist;
        if (data.icon !== undefined) this.icon = data.icon ?? null;
        else if (this.icon === undefined) this.icon = null;
        if (data.unicode_emoji !== undefined) this.unicodeEmoji = data.unicode_emoji ?? null;
        else if (this.unicodeEmoji === undefined) this.unicodeEmoji = null;
        if (data.position !== undefined) this.position = data.position;
        if (data.permissions !== undefined) this.permissions = Permissions.fromRole(data.permissions);
        if (data.managed !== undefined) this.managed = data.managed;
        if (data.mentionable !== undefined) this.mentionable = data.mentionable;
        if (data.tags !== undefined) this.tags = data.tags;
        if (data.flags !== undefined) this.flags = data.flags;
    }

    /** The guild this role belongs to. */
    get guild(): Guild | undefined {
        return this.client.guilds.get(this.guildId);
    }

    /** Color as a hex string (e.g. "#ff0000"). */
    get hexColor(): string {
        return `#${this.color.toString(16).padStart(6, "0")}`;
    }

    /** Whether this is the @everyone role. */
    get isEveryone(): boolean {
        return this.id === this.guildId;
    }

    /** Compare position to another role. Positive means this role is higher. */
    comparePositionTo(role: Role): number {
        if (this.position !== role.position) return this.position - role.position;
        // Lower ID = created first = higher priority at same position
        return Number(BigInt(role.id) - BigInt(this.id));
    }

    /** Edit this role. */
    async edit(data: EditRoleOptions, reason?: string): Promise<Role> {
        const body: Record<string, unknown> = { ...data };
        if (typeof data.permissions === "bigint") {
            body.permissions = data.permissions.toString();
        }
        const result = await this.client.rest.patch<APIRole>(
            `/guilds/${this.guildId}/roles/${this.id}`,
            { body, reason },
        );
        this._patch(result);
        return this;
    }

    /** Delete this role. */
    async delete(reason?: string): Promise<void> {
        await this.client.rest.delete(`/guilds/${this.guildId}/roles/${this.id}`, { reason });
    }

    /** Set the role name. */
    setName(name: string, reason?: string): Promise<Role> {
        return this.edit({ name }, reason);
    }

    /** Set the role color. */
    setColor(color: number, reason?: string): Promise<Role> {
        return this.edit({ color }, reason);
    }

    /** Set the role permissions. */
    setPermissions(permissions: string | bigint, reason?: string): Promise<Role> {
        return this.edit({ permissions }, reason);
    }

    /** Set whether this role is hoisted. */
    setHoist(hoist: boolean, reason?: string): Promise<Role> {
        return this.edit({ hoist }, reason);
    }

    /** Set whether this role is mentionable. */
    setMentionable(mentionable: boolean, reason?: string): Promise<Role> {
        return this.edit({ mentionable }, reason);
    }

    /** Set the role icon (requires ROLE_ICONS feature). */
    setIcon(icon: string | null, reason?: string): Promise<Role> {
        return this.edit({ icon }, reason);
    }

    /** Set the role position via the bulk-modify positions endpoint. */
    async setPosition(position: number, reason?: string): Promise<Role> {
        await this.client.rest.patch(`/guilds/${this.guildId}/roles`, {
            body: [{ id: this.id, position }],
            reason,
        });
        this.position = position;
        return this;
    }

    /** Mention string for this role. */
    toString(): string {
        if (this.isEveryone) return "@everyone";
        return `<@&${this.id}>`;
    }

    toJSON(): APIRole {
        return {
            id: this.id,
            name: this.name,
            color: this.color,
            hoist: this.hoist,
            icon: this.icon,
            unicode_emoji: this.unicodeEmoji,
            position: this.position,
            permissions: this.permissions.toString(),
            managed: this.managed,
            mentionable: this.mentionable,
            tags: this.tags,
            flags: this.flags,
        };
    }
}
