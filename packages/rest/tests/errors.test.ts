import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DiscordAPIError, HTTPError } from "../src/errors.js";

describe("DiscordAPIError", () => {
    it("should format message with code", () => {
        const err = new DiscordAPIError(400, 50035, "Invalid Form Body", undefined, "POST", "/channels/1/messages");
        assert.equal(err.message, "[50035] Invalid Form Body");
        assert.equal(err.status, 400);
        assert.equal(err.code, 50035);
        assert.equal(err.name, "DiscordAPIError");
    });
});

describe("HTTPError", () => {
    it("should format message with status", () => {
        const err = new HTTPError(500, "GET", "/gateway/bot");
        assert.equal(err.message, "HTTP 500 on GET /gateway/bot");
        assert.equal(err.status, 500);
        assert.equal(err.name, "HTTPError");
    });
});
