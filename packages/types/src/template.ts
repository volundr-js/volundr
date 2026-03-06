import type { Snowflake } from "./common.js";
import type { APIUser } from "./user.js";
import type { APIGuild } from "./guild.js";

export interface APIGuildTemplate {
    code: string;
    name: string;
    description: string | null;
    usage_count: number;
    creator_id: Snowflake;
    creator: APIUser;
    created_at: string;
    updated_at: string;
    source_guild_id: Snowflake;
    serialized_source_guild: Partial<APIGuild>;
    is_dirty: boolean | null;
}
