import type { Snowflake } from "@volundr/types";
import type { Client } from "../Client.js";

/** Discord epoch (2015-01-01T00:00:00.000Z) */
const DISCORD_EPOCH = 1420070400000n;

/**
 * Base class for all Discord entities with a Snowflake ID.
 */
export abstract class BaseEntity {
    readonly client: Client;
    readonly id: Snowflake;

    /** Cached timestamp derived from snowflake. Computed once on first access. */
    private _createdTimestamp: number | undefined;

    constructor(client: Client, id: Snowflake) {
        this.client = client;
        this.id = id;
    }

    /** Timestamp (ms since Unix epoch) encoded in the snowflake. */
    get createdTimestamp(): number {
        if (this._createdTimestamp === undefined) {
            this._createdTimestamp = Number(BigInt(this.id) >> 22n) + Number(DISCORD_EPOCH);
        }
        return this._createdTimestamp;
    }

    /** Date the entity was created at. */
    get createdAt(): Date {
        return new Date(this.createdTimestamp);
    }

    /** Check equality by ID. */
    equals(other: BaseEntity): boolean {
        return this.id === other.id;
    }

    valueOf(): string {
        return this.id;
    }

    abstract toJSON(): unknown;

    /** Update internal data from a partial payload. Subclasses implement this. */
    abstract _patch(data: unknown): void;
}
