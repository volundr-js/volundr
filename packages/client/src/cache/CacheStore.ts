import type { Snowflake } from "@volundr/types";

export class CacheStore<T> extends Map<Snowflake, T> {
    find(fn: (value: T, key: Snowflake) => boolean): T | undefined {
        for (const [key, value] of this) {
            if (fn(value, key)) return value;
        }
        return undefined;
    }

    filter(fn: (value: T, key: Snowflake) => boolean): T[] {
        const results: T[] = [];
        for (const [key, value] of this) {
            if (fn(value, key)) results.push(value);
        }
        return results;
    }

    map<R>(fn: (value: T, key: Snowflake) => R): R[] {
        const results: R[] = [];
        for (const [key, value] of this) {
            results.push(fn(value, key));
        }
        return results;
    }

    some(fn: (value: T, key: Snowflake) => boolean): boolean {
        for (const [key, value] of this) {
            if (fn(value, key)) return true;
        }
        return false;
    }

    every(fn: (value: T, key: Snowflake) => boolean): boolean {
        for (const [key, value] of this) {
            if (!fn(value, key)) return false;
        }
        return true;
    }

    sweep(fn: (value: T, key: Snowflake) => boolean): number {
        let count = 0;
        for (const [key, value] of this) {
            if (fn(value, key)) {
                this.delete(key);
                count++;
            }
        }
        return count;
    }

    first(): T | undefined {
        return this.values().next().value;
    }

    array(): T[] {
        return [...this.values()];
    }
}
