import { Logger } from "@volundr/logger";
import type { BucketState } from "./types.js";

const log = Logger.getLogger("rest", "RateLimiter");

/** How often to evict stale bucket entries (ms). */
const EVICT_INTERVAL = 60_000;
/** Buckets are considered stale after this many ms past their reset time. */
const BUCKET_STALE_MS = 60_000;

export class RateLimiter {
    private routeToBucket = new Map<string, string>();
    private buckets = new Map<string, BucketState>();
    private globalResetAt = 0;
    private requestsSinceEvict = 0;

    isGloballyLimited(): boolean {
        return Date.now() < this.globalResetAt;
    }

    getGlobalWaitTime(): number {
        return Math.max(0, this.globalResetAt - Date.now());
    }

    setGlobalLimit(retryAfter: number): void {
        this.globalResetAt = Date.now() + retryAfter * 1000;
        log.warn(`Global rate limit hit, reset in ${retryAfter}s`);
    }

    getRouteWaitTime(bucketKey: string): number {
        const hash = this.routeToBucket.get(bucketKey);
        if (!hash) return 0;

        const bucket = this.buckets.get(hash);
        if (!bucket) return 0;
        if (bucket.remaining > 0) return 0;
        return Math.max(0, bucket.resetAt - Date.now());
    }

    updateFromHeaders(bucketKey: string, headers: Headers): void {
        const remaining = headers.get("x-ratelimit-remaining");
        const limit = headers.get("x-ratelimit-limit");
        const resetAfter = headers.get("x-ratelimit-reset-after");
        const bucketHash = headers.get("x-ratelimit-bucket");

        if (remaining === null || limit === null) return;

        const stateKey = bucketHash ?? bucketKey;

        if (bucketHash) {
            this.routeToBucket.set(bucketKey, bucketHash);
        }

        // Mutate existing bucket state if present, otherwise create new
        const parsedResetAfter = Number(resetAfter ?? 0);
        const existing = this.buckets.get(stateKey);
        if (existing) {
            existing.bucketHash = bucketHash;
            existing.remaining = Number(remaining);
            existing.limit = Number(limit);
            existing.resetAt = Date.now() + parsedResetAfter * 1000;
            existing.resetAfter = parsedResetAfter;
        } else {
            this.buckets.set(stateKey, {
                bucketHash,
                remaining: Number(remaining),
                limit: Number(limit),
                resetAt: Date.now() + parsedResetAfter * 1000,
                resetAfter: parsedResetAfter,
            });
        }

        // Periodic stale bucket eviction
        if (++this.requestsSinceEvict >= 100) {
            this.evictStaleBuckets();
        }
    }

    /** Remove bucket entries that have expired long ago. */
    private evictStaleBuckets(): void {
        this.requestsSinceEvict = 0;
        const now = Date.now();
        for (const [key, bucket] of this.buckets) {
            if (bucket.resetAt + BUCKET_STALE_MS < now) {
                this.buckets.delete(key);
            }
        }
    }

    exportBucketMap(): Map<string, string> {
        return new Map(this.routeToBucket);
    }

    importBucketMap(map: Map<string, string>): void {
        for (const [route, hash] of map) {
            this.routeToBucket.set(route, hash);
        }
        log.info(`Imported ${map.size} route->bucket mappings`);
    }
}
