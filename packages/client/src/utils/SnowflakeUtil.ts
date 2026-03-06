import type { Snowflake } from "@volundr/types";

/** Discord epoch: first second of 2015 in milliseconds. */
const DISCORD_EPOCH = 1420070400000n;

export const SnowflakeUtil = {
    /** Extract the creation timestamp (in ms since Unix epoch) from a Snowflake. */
    timestampFrom(snowflake: Snowflake): number {
        return Number((BigInt(snowflake) >> 22n) + DISCORD_EPOCH);
    },

    /** Convert a Snowflake to a Date object. */
    toDate(snowflake: Snowflake): Date {
        return new Date(SnowflakeUtil.timestampFrom(snowflake));
    },

    /** Deconstruct a Snowflake into its components. */
    deconstruct(snowflake: Snowflake): {
        timestamp: number;
        workerId: number;
        processId: number;
        increment: number;
    } {
        const id = BigInt(snowflake);
        return {
            timestamp: Number((id >> 22n) + DISCORD_EPOCH),
            workerId: Number((id >> 17n) & 0b11111n),
            processId: Number((id >> 12n) & 0b11111n),
            increment: Number(id & 0b111111111111n),
        };
    },

    /** Generate a Snowflake from a timestamp (Date or ms since Unix epoch). */
    generate(timestamp: Date | number = Date.now()): Snowflake {
        const ms = timestamp instanceof Date ? timestamp.getTime() : timestamp;
        return String((BigInt(ms) - DISCORD_EPOCH) << 22n);
    },

    /** The Discord epoch as a number (ms since Unix epoch). */
    DISCORD_EPOCH: Number(DISCORD_EPOCH),
} as const;
