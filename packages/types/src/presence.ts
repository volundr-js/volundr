import type { Snowflake } from "./common.js";
import type { APIUser } from "./user.js";

export type StatusType = "online" | "dnd" | "idle" | "invisible" | "offline";

export interface APIPresenceUpdate {
    user: Partial<APIUser> & { id: Snowflake };
    guild_id: Snowflake;
    status: StatusType;
    activities: APIActivity[];
    client_status: APIClientStatus;
}

export enum ActivityType {
    Playing = 0,
    Streaming = 1,
    Listening = 2,
    Watching = 3,
    Custom = 4,
    Competing = 5,
}

export interface APIActivity {
    name: string;
    type: ActivityType;
    url?: string | null;
    created_at: number;
    timestamps?: APIActivityTimestamps;
    application_id?: Snowflake;
    details?: string | null;
    state?: string | null;
    emoji?: APIActivityEmoji | null;
    party?: APIActivityParty;
    assets?: APIActivityAssets;
    secrets?: APIActivitySecrets;
    instance?: boolean;
    flags?: number;
    buttons?: APIActivityButton[];
}

export interface APIActivityTimestamps {
    start?: number;
    end?: number;
}

export interface APIActivityEmoji {
    name: string;
    id?: Snowflake;
    animated?: boolean;
}

export interface APIActivityParty {
    id?: string;
    size?: [number, number];
}

export interface APIActivityAssets {
    large_image?: string;
    large_text?: string;
    small_image?: string;
    small_text?: string;
}

export interface APIActivitySecrets {
    join?: string;
    spectate?: string;
    match?: string;
}

export interface APIActivityButton {
    label: string;
    url: string;
}

export interface APIClientStatus {
    desktop?: StatusType;
    mobile?: StatusType;
    web?: StatusType;
}
