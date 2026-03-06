import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { computeBucketKey } from "../src/BucketKey.js";

describe("computeBucketKey", () => {
    it("should preserve major params (channels)", () => {
        const key = computeBucketKey("GET", "/channels/123456789012345678/messages");
        assert.equal(key, "GET:/channels/123456789012345678/messages");
    });

    it("should preserve major params (guilds)", () => {
        const key = computeBucketKey("GET", "/guilds/123456789012345678/members");
        assert.equal(key, "GET:/guilds/123456789012345678/members");
    });

    it("should anonymize non-major snowflake params", () => {
        const key = computeBucketKey("GET", "/channels/123456789012345678/messages/987654321098765432");
        assert.equal(key, "GET:/channels/123456789012345678/messages/:id");
    });

    it("should preserve webhooks as major param", () => {
        const key = computeBucketKey("POST", "/webhooks/123456789012345678/token");
        assert.equal(key, "POST:/webhooks/123456789012345678/token");
    });

    it("should handle simple routes", () => {
        const key = computeBucketKey("GET", "/gateway/bot");
        assert.equal(key, "GET:/gateway/bot");
    });
});
