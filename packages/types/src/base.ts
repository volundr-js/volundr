import type { Snowflake } from "./common.js";

export interface HasId {
    id: Snowflake;
}

export interface Mentionable extends HasId {}

export interface Nameable {
    name: string;
}

export interface ImageHolder {
    icon: string | null;
}
