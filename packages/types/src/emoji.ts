import type { Snowflake } from "./common.js";
import type { APIUser } from "./user.js";

export interface APIEmoji {
    id: Snowflake | null;
    name: string | null;
    roles?: Snowflake[];
    user?: APIUser;
    require_colons?: boolean;
    managed?: boolean;
    animated?: boolean;
    available?: boolean;
}
