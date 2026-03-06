import type { APIPresenceUpdate, APIActivity, APIClientStatus, StatusType, Snowflake } from "@volundr/types";
import type { Client } from "../Client.js";
import type { User } from "./User.js";
import type { Guild } from "./Guild.js";

/**
 * Represents a user's presence (online status and activities).
 * Not a BaseEntity because presences don't have their own ID.
 */
export class Presence {
    readonly client: Client;
    userId!: Snowflake;
    guildId!: Snowflake;
    status!: StatusType;
    activities!: APIActivity[];
    clientStatus!: APIClientStatus;

    constructor(client: Client, data: APIPresenceUpdate) {
        this.client = client;
        this._patch(data);
    }

    _patch(data: Partial<APIPresenceUpdate>): void {
        if (data.user?.id) this.userId = data.user.id;
        if (data.guild_id !== undefined) this.guildId = data.guild_id;
        if (data.status !== undefined) this.status = data.status;
        if (data.activities !== undefined) this.activities = data.activities;
        else if (this.activities === undefined) this.activities = [];
        if (data.client_status !== undefined) this.clientStatus = data.client_status;
    }

    /** The user this presence belongs to. */
    get user(): User | undefined {
        return this.client.users.get(this.userId);
    }

    /** The guild this presence is in. */
    get guild(): Guild | undefined {
        return this.client.guilds.get(this.guildId);
    }
}
