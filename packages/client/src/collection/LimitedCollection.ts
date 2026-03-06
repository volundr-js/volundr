import { Collection } from "./Collection.js";

export interface LimitedCollectionOptions<K, V> {
    /** Maximum number of entries. When exceeded, oldest entries are evicted. */
    maxSize?: number;
    /** Custom filter to decide which entries to keep on eviction. Return true to keep. */
    keepOverLimit?: (value: V, key: K, collection: LimitedCollection<K, V>) => boolean;
}

/**
 * A Collection with a maximum size limit.
 * When the limit is reached, the oldest entries (by insertion order) are evicted.
 */
export class LimitedCollection<K, V> extends Collection<K, V> {
    private readonly maxSize: number;
    private readonly keepOverLimit?: (value: V, key: K, collection: this) => boolean;

    constructor(options: LimitedCollectionOptions<K, V> = {}) {
        super();
        this.maxSize = options.maxSize ?? Infinity;
        this.keepOverLimit = options.keepOverLimit as ((value: V, key: K, collection: this) => boolean) | undefined;
    }

    override set(key: K, value: V): this {
        if (this.maxSize === 0) return this;

        // If updating an existing key, just update
        if (this.has(key)) {
            super.set(key, value);
            return this;
        }

        // If at capacity, evict oldest entries
        if (this.size >= this.maxSize) {
            this.evict();
        }

        super.set(key, value);
        return this;
    }

    private evict(): void {
        // Remove oldest entries until we're under the limit
        const toRemove = this.size - this.maxSize + 1;
        let removed = 0;

        for (const [key, value] of this) {
            if (removed >= toRemove) break;

            // If keepOverLimit returns true, skip this entry
            if (this.keepOverLimit && this.keepOverLimit(value, key, this)) continue;

            this.delete(key);
            removed++;
        }
    }
}
