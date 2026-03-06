import { EventEmitter } from "node:events";
import { Collection } from "../collection/Collection.js";

export interface BaseCollectorOptions<T> {
    filter?: (item: T) => boolean;
    max?: number;
    time?: number;
    /** Idle timeout - resets on each collected item. */
    idle?: number;
    /** Whether to emit "dispose" when items are removed. */
    dispose?: boolean;
}

/**
 * Base collector class with idle timeout, dispose support,
 * async iteration, and collected items as a Collection.
 */
export abstract class Collector<K, V> extends EventEmitter {
    readonly collected = new Collection<K, V>();
    ended = false;
    endReason: string | null = null;

    protected readonly filter: (item: V) => boolean;
    protected readonly max: number;
    private timer: ReturnType<typeof setTimeout> | null = null;
    private idleTimer: ReturnType<typeof setTimeout> | null = null;
    private readonly idleTimeout: number | undefined;
    private readonly disposeEnabled: boolean;
    private received = 0;

    constructor(options: BaseCollectorOptions<V> = {}) {
        super();
        this.filter = options.filter ?? (() => true);
        this.max = options.max ?? Infinity;
        this.idleTimeout = options.idle;
        this.disposeEnabled = options.dispose ?? false;

        if (options.time) {
            this.timer = setTimeout(() => this.stop("time"), options.time);
        }

        this.resetIdleTimer();
    }

    /** Subclasses must return a key for each collected item. */
    protected abstract getKey(item: V): K;

    /** Handle an incoming item. Called by the Client event wiring. */
    handleCollect(item: V): void {
        if (this.ended) return;
        if (!this.filter(item)) return;

        this.received++;
        const key = this.getKey(item);
        this.collected.set(key, item);
        this.emit("collect", item);

        this.resetIdleTimer();

        if (this.collected.size >= this.max) {
            this.stop("limit");
        }
    }

    /** Handle a dispose event (item was removed/deleted). */
    handleDispose(item: V): void {
        if (this.ended || !this.disposeEnabled) return;

        const key = this.getKey(item);
        if (this.collected.has(key)) {
            this.collected.delete(key);
            this.emit("dispose", item);
        }
    }

    /** Stop the collector. */
    stop(reason = "manual"): void {
        if (this.ended) return;
        this.ended = true;
        this.endReason = reason;

        if (this.timer) { clearTimeout(this.timer); this.timer = null; }
        if (this.idleTimer) { clearTimeout(this.idleTimer); this.idleTimer = null; }

        this.emit("end", this.collected, reason);
    }

    /** Reset the idle timer. Called on each collected item. */
    private resetIdleTimer(): void {
        if (this.idleTimeout === undefined) return;
        if (this.idleTimer) clearTimeout(this.idleTimer);
        this.idleTimer = setTimeout(() => this.stop("idle"), this.idleTimeout);
    }

    /** Enables `using collector = client.createMessageCollector(...)` for auto-stop. */
    [Symbol.dispose](): void {
        if (!this.ended) this.stop("dispose");
    }

    get isEnded(): boolean {
        return this.ended;
    }

    /** Total items received (including filtered out). */
    get totalReceived(): number {
        return this.received;
    }

    /** Async iterator - yields collected items until the collector ends. */
    async *[Symbol.asyncIterator](): AsyncGenerator<[K, V], void, undefined> {
        const queue: [K, V][] = [];
        let resolve: (() => void) | null = null;
        let done = false;

        const onCollect = (item: V) => {
            const key = this.getKey(item);
            queue.push([key, item]);
            resolve?.();
        };

        const onEnd = () => {
            done = true;
            resolve?.();
        };

        this.on("collect", onCollect);
        this.on("end", onEnd);

        try {
            while (!done) {
                if (queue.length > 0) {
                    yield queue.shift()!;
                } else {
                    await new Promise<void>(r => { resolve = r; });
                    resolve = null;
                }
            }
            // Yield any remaining items
            while (queue.length > 0) {
                yield queue.shift()!;
            }
        } finally {
            this.off("collect", onCollect);
            this.off("end", onEnd);
        }
    }
}
