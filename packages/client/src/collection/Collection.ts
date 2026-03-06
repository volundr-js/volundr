/**
 * An extended Map with utility methods for Discord entity caching.
 * Inspired by discord.js Collection but with additional utilities.
 */
export class Collection<K, V> extends Map<K, V> {
    /**
     * Find the first value that satisfies the predicate.
     */
    find(fn: (value: V, key: K, collection: this) => boolean): V | undefined {
        for (const [key, value] of this) {
            if (fn(value, key, this)) return value;
        }
        return undefined;
    }

    /**
     * Find the first key that satisfies the predicate.
     */
    findKey(fn: (value: V, key: K, collection: this) => boolean): K | undefined {
        for (const [key, value] of this) {
            if (fn(value, key, this)) return key;
        }
        return undefined;
    }

    /**
     * Return a new Collection with only entries that satisfy the predicate.
     */
    filter(fn: (value: V, key: K, collection: this) => boolean): Collection<K, V> {
        const result = new Collection<K, V>();
        this.forEach((value, key) => {
            if (fn(value, key, this)) result.set(key, value);
        });
        return result;
    }

    /**
     * Map each entry to a new value and return as an array.
     */
    map<T>(fn: (value: V, key: K, collection: this) => T): T[] {
        const result = new Array<T>(this.size);
        let i = 0;
        this.forEach((value, key) => {
            result[i++] = fn(value, key, this);
        });
        return result;
    }

    /**
     * Map each value, returning a new Collection with the same keys.
     */
    mapValues<T>(fn: (value: V, key: K, collection: this) => T): Collection<K, T> {
        const result = new Collection<K, T>();
        this.forEach((value, key) => {
            result.set(key, fn(value, key, this));
        });
        return result;
    }

    /**
     * Check if at least one entry satisfies the predicate.
     */
    some(fn: (value: V, key: K, collection: this) => boolean): boolean {
        for (const [key, value] of this) {
            if (fn(value, key, this)) return true;
        }
        return false;
    }

    /**
     * Check if every entry satisfies the predicate.
     */
    every(fn: (value: V, key: K, collection: this) => boolean): boolean {
        for (const [key, value] of this) {
            if (!fn(value, key, this)) return false;
        }
        return true;
    }

    /**
     * Remove entries that satisfy the predicate. Returns the number of removed entries.
     */
    sweep(fn: (value: V, key: K, collection: this) => boolean): number {
        const toDelete: K[] = [];
        this.forEach((value, key) => {
            if (fn(value, key, this)) toDelete.push(key);
        });
        for (let i = 0; i < toDelete.length; i++) this.delete(toDelete[i]);
        return toDelete.length;
    }

    /**
     * Reduce the collection to a single value.
     */
    reduce<T>(fn: (accumulator: T, value: V, key: K, collection: this) => T, initialValue: T): T {
        let acc = initialValue;
        this.forEach((value, key) => {
            acc = fn(acc, value, key, this);
        });
        return acc;
    }

    /**
     * Get the first value(s) from the collection.
     */
    first(): V | undefined;
    first(count: number): V[];
    first(count?: number): V | V[] | undefined {
        if (count === undefined) {
            return this.values().next().value;
        }
        if (count < 0) return this.last(count * -1);
        const len = Math.min(count, this.size);
        const result = new Array<V>(len);
        let i = 0;
        for (const value of this.values()) {
            if (i >= len) break;
            result[i++] = value;
        }
        return result;
    }

    /**
     * Get the last value(s) from the collection.
     */
    last(): V | undefined;
    last(count: number): V[];
    last(count?: number): V | V[] | undefined {
        if (count === undefined) {
            // O(n) iteration but zero allocation
            let last: V | undefined;
            for (const v of this.values()) last = v;
            return last;
        }
        if (count < 0) return this.first(count * -1);
        if (!count) return [];
        const arr = [...this.values()];
        return arr.slice(-count);
    }

    /**
     * Get the value at a specific index (ordered by insertion).
     * O(index) iteration, zero allocation.
     */
    at(index: number): V | undefined {
        if (index < 0) index = this.size + index;
        if (index < 0 || index >= this.size) return undefined;
        let i = 0;
        for (const value of this.values()) {
            if (i === index) return value;
            i++;
        }
        return undefined;
    }

    /**
     * Get the key at a specific index.
     * O(index) iteration, zero allocation.
     */
    keyAt(index: number): K | undefined {
        if (index < 0) index = this.size + index;
        if (index < 0 || index >= this.size) return undefined;
        let i = 0;
        for (const key of this.keys()) {
            if (i === index) return key;
            i++;
        }
        return undefined;
    }

    /**
     * Get a random value from the collection.
     */
    random(): V | undefined;
    random(count: number): V[];
    random(count?: number): V | V[] | undefined {
        if (this.size === 0) return count === undefined ? undefined : [];
        if (count === undefined) {
            // Zero allocation: pick random index then iterate to it
            return this.at(Math.floor(Math.random() * this.size));
        }
        // Multiple random: need array for splice
        const arr = [...this.values()];
        return Array.from(
            { length: Math.min(count, arr.length) },
            () => arr.splice(Math.floor(Math.random() * arr.length), 1)[0],
        );
    }

    /**
     * Return all values as an array.
     */
    array(): V[] {
        const result = new Array<V>(this.size);
        let i = 0;
        this.forEach((value) => {
            result[i++] = value;
        });
        return result;
    }

    /**
     * Return all keys as an array.
     */
    keyArray(): K[] {
        const result = new Array<K>(this.size);
        let i = 0;
        this.forEach((_value, key) => {
            result[i++] = key;
        });
        return result;
    }

    /**
     * Sort the collection by a comparator. Returns a new Collection.
     */
    sort(compareFn: (a: V, b: V, ka: K, kb: K) => number = () => 0): Collection<K, V> {
        const entries = new Array<[K, V]>(this.size);
        let i = 0;
        this.forEach((value, key) => {
            entries[i++] = [key, value];
        });
        entries.sort(([ka, a], [kb, b]) => compareFn(a, b, ka, kb));
        const sorted = new Collection<K, V>();
        for (i = 0; i < entries.length; i++) sorted.set(entries[i][0], entries[i][1]);
        return sorted;
    }

    /**
     * Create a shallow clone of this collection.
     */
    clone(): Collection<K, V> {
        return new Collection<K, V>(this);
    }

    /**
     * Merge this collection with one or more others. Later values overwrite earlier ones.
     */
    concat(...collections: Collection<K, V>[]): Collection<K, V> {
        const result = this.clone();
        for (let c = 0; c < collections.length; c++) {
            collections[c].forEach((value, key) => result.set(key, value));
        }
        return result;
    }

    /**
     * Partition the collection into two based on a predicate.
     * First collection contains entries where predicate is true, second where false.
     */
    partition(fn: (value: V, key: K, collection: this) => boolean): [Collection<K, V>, Collection<K, V>] {
        const truthy = new Collection<K, V>();
        const falsy = new Collection<K, V>();
        this.forEach((value, key) => {
            if (fn(value, key, this)) {
                truthy.set(key, value);
            } else {
                falsy.set(key, value);
            }
        });
        return [truthy, falsy];
    }

    /**
     * Like forEach but returns this for chaining.
     */
    each(fn: (value: V, key: K, collection: this) => void): this {
        this.forEach((value, key) => {
            fn(value, key, this);
        });
        return this;
    }

    /**
     * Run a side-effect function with the collection, then return this.
     */
    tap(fn: (collection: this) => void): this {
        fn(this);
        return this;
    }

    /**
     * Check if the collection contains all of the specified keys.
     */
    hasAll(...keys: K[]): boolean {
        return keys.every((k) => this.has(k));
    }

    /**
     * Check if the collection contains any of the specified keys.
     */
    hasAny(...keys: K[]): boolean {
        return keys.some((k) => this.has(k));
    }

    /**
     * Return entries in this collection that are NOT in the other.
     */
    difference(other: Collection<K, V>): Collection<K, V> {
        const result = new Collection<K, V>();
        this.forEach((value, key) => {
            if (!other.has(key)) result.set(key, value);
        });
        return result;
    }

    /**
     * Return entries that exist in BOTH collections.
     */
    intersect(other: Collection<K, V>): Collection<K, V> {
        const result = new Collection<K, V>();
        this.forEach((value, key) => {
            if (other.has(key)) result.set(key, value);
        });
        return result;
    }

    /**
     * Map each entry to an array of values and flatten the result.
     */
    flatMap<T>(fn: (value: V, key: K, collection: this) => T[]): T[] {
        const result: T[] = [];
        this.forEach((value, key) => {
            const items = fn(value, key, this);
            for (let i = 0; i < items.length; i++) result.push(items[i]);
        });
        return result;
    }

    /**
     * Reverse the order of entries. Returns a new Collection.
     */
    reverse(): Collection<K, V> {
        const entries = new Array<[K, V]>(this.size);
        let i = 0;
        this.forEach((value, key) => {
            entries[i++] = [key, value];
        });
        entries.reverse();
        const result = new Collection<K, V>();
        for (i = 0; i < entries.length; i++) result.set(entries[i][0], entries[i][1]);
        return result;
    }

    /**
     * Get the value for a key, inserting a default if it doesn't exist.
     */
    ensure(key: K, defaultValueFn: (key: K) => V): V {
        if (this.has(key)) return this.get(key)!;
        const defaultValue = defaultValueFn(key);
        this.set(key, defaultValue);
        return defaultValue;
    }

    /**
     * Check if this collection has identical keys and values to another.
     */
    equals(other: Collection<K, V>): boolean {
        if (this.size !== other.size) return false;
        for (const [key, value] of this) {
            if (!other.has(key) || other.get(key) !== value) return false;
        }
        return true;
    }

    /**
     * Convert the collection values to a JSON-serializable array.
     */
    toJSON(): V[] {
        return this.array();
    }
}
