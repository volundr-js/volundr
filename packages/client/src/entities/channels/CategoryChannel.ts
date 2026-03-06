import type { APIChannel } from "@volundr/types";
import { GuildChannel } from "./GuildChannel.js";
import type { Client } from "../../Client.js";
import { Collection } from "../../collection/Collection.js";
import type { Snowflake } from "@volundr/types";

export class CategoryChannel extends GuildChannel {
    constructor(client: Client, data: APIChannel) {
        super(client, data);
    }

    /** All guild channels that are children of this category. */
    get children(): Collection<Snowflake, GuildChannel> {
        const guild = this.guild;
        if (!guild) return new Collection();
        return guild.channels.filter(
            (ch): ch is GuildChannel => ch instanceof GuildChannel && ch.parentId === this.id,
        );
    }
}
