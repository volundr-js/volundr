import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { WebhookClient } from "../src/webhook/WebhookClient.js";

describe("WebhookClient", () => {
    it("should construct from id and token", () => {
        const wh = new WebhookClient("123456789012345678", "abc-token");
        assert.equal(wh.id, "123456789012345678");
        assert.equal(wh.token, "abc-token");
    });

    it("should construct from URL", () => {
        const wh = new WebhookClient("https://discord.com/api/webhooks/123456789012345678/abc-token");
        assert.equal(wh.id, "123456789012345678");
        assert.equal(wh.token, "abc-token");
    });

    it("should construct from discordapp.com URL", () => {
        const wh = new WebhookClient("https://discordapp.com/api/webhooks/123456789012345678/abc-token");
        assert.equal(wh.id, "123456789012345678");
        assert.equal(wh.token, "abc-token");
    });

    it("should throw on invalid URL", () => {
        assert.throws(() => new WebhookClient("not-a-valid-url"), {
            message: "Invalid webhook URL",
        });
    });
});
