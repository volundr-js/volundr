import type { Snowflake } from "./common.js";
import type { APIUser } from "./user.js";

export enum StickerType {
    Standard = 1,
    Guild = 2,
}

export enum StickerFormatType {
    PNG = 1,
    APNG = 2,
    Lottie = 3,
    GIF = 4,
}

export interface APISticker {
    id: Snowflake;
    pack_id?: Snowflake;
    name: string;
    description: string | null;
    tags: string;
    type: StickerType;
    format_type: StickerFormatType;
    available?: boolean;
    guild_id?: Snowflake;
    user?: APIUser;
    sort_value?: number;
}
