import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { RateLimiter } from "../src/RateLimiter.js";

function makeHeaders(data: Record<string, string>): Headers {
    return new Headers(data);
}

describe("RateLimiter", () => {
    it("should return 0 wait time for unknown routes", () => {
        const limiter = new RateLimiter();
        assert.equal(limiter.getRouteWaitTime("GET:/unknown"), 0);
    });

    it("should return 0 wait time when remaining > 0", () => {
        const limiter = new RateLimiter();
        limiter.updateFromHeaders("GET:/channels/:id/messages", makeHeaders({
            "x-ratelimit-remaining": "5",
            "x-ratelimit-limit": "10",
            "x-ratelimit-reset-after": "5",
            "x-ratelimit-bucket": "bucket-abc",
        }));
        assert.equal(limiter.getRouteWaitTime("GET:/channels/:id/messages"), 0);
    });

    it("should return wait time when remaining is 0", () => {
        const limiter = new RateLimiter();
        limiter.updateFromHeaders("GET:/channels/:id/messages", makeHeaders({
            "x-ratelimit-remaining": "0",
            "x-ratelimit-limit": "10",
            "x-ratelimit-reset-after": "5",
            "x-ratelimit-bucket": "bucket-abc",
        }));
        const wait = limiter.getRouteWaitTime("GET:/channels/:id/messages");
        assert.ok(wait > 0);
        assert.ok(wait <= 5000);
    });

    it("should group routes by bucket hash", () => {
        const limiter = new RateLimiter();

        // First route learns bucket hash
        limiter.updateFromHeaders("GET:/channels/123/messages", makeHeaders({
            "x-ratelimit-remaining": "5",
            "x-ratelimit-limit": "10",
            "x-ratelimit-reset-after": "5",
            "x-ratelimit-bucket": "shared-hash",
        }));

        // Second route with same bucket hash
        limiter.updateFromHeaders("GET:/channels/456/messages", makeHeaders({
            "x-ratelimit-remaining": "4",
            "x-ratelimit-limit": "10",
            "x-ratelimit-reset-after": "5",
            "x-ratelimit-bucket": "shared-hash",
        }));

        // Exhaust via first route
        limiter.updateFromHeaders("GET:/channels/123/messages", makeHeaders({
            "x-ratelimit-remaining": "0",
            "x-ratelimit-limit": "10",
            "x-ratelimit-reset-after": "5",
            "x-ratelimit-bucket": "shared-hash",
        }));

        // Second route should also be limited (same bucket)
        const wait = limiter.getRouteWaitTime("GET:/channels/456/messages");
        assert.ok(wait > 0, "Routes sharing a bucket hash should share rate limit state");
    });

    it("should not mix routes with different bucket hashes", () => {
        const limiter = new RateLimiter();

        limiter.updateFromHeaders("GET:/channels/123/messages", makeHeaders({
            "x-ratelimit-remaining": "0",
            "x-ratelimit-limit": "10",
            "x-ratelimit-reset-after": "5",
            "x-ratelimit-bucket": "bucket-A",
        }));

        limiter.updateFromHeaders("GET:/guilds/123", makeHeaders({
            "x-ratelimit-remaining": "5",
            "x-ratelimit-limit": "10",
            "x-ratelimit-reset-after": "5",
            "x-ratelimit-bucket": "bucket-B",
        }));

        assert.ok(limiter.getRouteWaitTime("GET:/channels/123/messages") > 0);
        assert.equal(limiter.getRouteWaitTime("GET:/guilds/123"), 0);
    });

    it("should track global rate limit", () => {
        const limiter = new RateLimiter();
        assert.equal(limiter.isGloballyLimited(), false);
        assert.equal(limiter.getGlobalWaitTime(), 0);

        limiter.setGlobalLimit(1);
        assert.equal(limiter.isGloballyLimited(), true);
        assert.ok(limiter.getGlobalWaitTime() > 0);
    });

    it("should export and import bucket map", () => {
        const limiter = new RateLimiter();

        limiter.updateFromHeaders("GET:/channels/123/messages", makeHeaders({
            "x-ratelimit-remaining": "5",
            "x-ratelimit-limit": "10",
            "x-ratelimit-reset-after": "5",
            "x-ratelimit-bucket": "hash-xyz",
        }));

        const exported = limiter.exportBucketMap();
        assert.equal(exported.size, 1);
        assert.equal(exported.get("GET:/channels/123/messages"), "hash-xyz");

        const limiter2 = new RateLimiter();
        limiter2.importBucketMap(exported);
        const exported2 = limiter2.exportBucketMap();
        assert.equal(exported2.get("GET:/channels/123/messages"), "hash-xyz");
    });

    it("should skip headers without remaining/limit", () => {
        const limiter = new RateLimiter();
        limiter.updateFromHeaders("GET:/test", makeHeaders({}));
        assert.equal(limiter.getRouteWaitTime("GET:/test"), 0);
    });
});
