import type { APIChannel, APIOverwrite, APIInvite, CreateInviteOptions, Snowflake } from "@volundr/types";
import { BaseChannel } from "./BaseChannel.js";
import type { Client } from "../../Client.js";
import type { Guild } from "../Guild.js";
import type { GuildMember } from "../GuildMember.js";
import type { Permissions } from "../../permissions/Permissions.js";

export interface EditChannelOptions {
    name?: string;
    position?: number | null;
    parent_id?: Snowflake | null;
    permission_overwrites?: APIOverwrite[];
}

export class GuildChannel extends BaseChannel {
    guildId!: Snowflake;
    position!: number;
    parentId!: Snowflake | null;
    permissionOverwrites!: APIOverwrite[];

    constructor(client: Client, data: APIChannel) {
        super(client, data);
    }

    override _patch(data: Partial<APIChannel>): void {
        super._patch(data);
        if (data.guild_id !== undefined) this.guildId = data.guild_id!;
        if (data.position !== undefined) this.position = data.position;
        else if (this.position === undefined) this.position = 0;
        if (data.parent_id !== undefined) this.parentId = data.parent_id ?? null;
        else if (this.parentId === undefined) this.parentId = null;
        if (data.permission_overwrites !== undefined) this.permissionOverwrites = data.permission_overwrites;
        else if (this.permissionOverwrites === undefined) this.permissionOverwrites = [];
    }

    /** The guild this channel belongs to. */
    get guild(): Guild | undefined {
        return this.client.guilds.get(this.guildId);
    }

    /** The parent category, if any. */
    get parent(): GuildChannel | undefined {
        if (!this.parentId) return undefined;
        return this.client.channels.get(this.parentId) as GuildChannel | undefined;
    }

    /** Edit this channel. */
    async edit(data: EditChannelOptions, reason?: string): Promise<this> {
        const result = await this.client.rest.patch<APIChannel>(
            `/channels/${this.id}`,
            { body: data, reason },
        );
        this._patch(result);
        return this;
    }

    /** Set the channel name. */
    setName(name: string, reason?: string): Promise<this> {
        return this.edit({ name }, reason);
    }

    /** Set the channel position. */
    setPosition(position: number, reason?: string): Promise<this> {
        return this.edit({ position }, reason);
    }

    /** Move this channel under a category. */
    setParent(parentId: Snowflake | null, reason?: string): Promise<this> {
        return this.edit({ parent_id: parentId }, reason);
    }

    /** Create an invite for this channel. */
    createInvite(options?: CreateInviteOptions, reason?: string): Promise<APIInvite> {
        return this.client.createInvite(this.id, options, reason);
    }

    /** Set a permission overwrite for a role or member. type: 0 = role, 1 = member. */
    setPermissionOverwrite(targetId: Snowflake, type: number, allow: string, deny: string, reason?: string): Promise<void> {
        return this.client.editPermissionOverwrite(this.id, targetId, { allow, deny, type }, reason);
    }

    /** Delete a permission overwrite for a role or member. */
    deletePermissionOverwrite(targetId: Snowflake, reason?: string): Promise<void> {
        return this.client.deletePermissionOverwrite(this.id, targetId, reason);
    }

    /** Compute effective permissions for a member in this channel. */
    permissionsFor(member: GuildMember): Permissions {
        return member.getPermissionsIn(this);
    }

    override toJSON(): APIChannel {
        return {
            ...super.toJSON(),
            guild_id: this.guildId,
            position: this.position,
            parent_id: this.parentId,
            permission_overwrites: this.permissionOverwrites,
        };
    }
}
