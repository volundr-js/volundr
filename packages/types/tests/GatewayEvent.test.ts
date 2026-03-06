import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { GatewayEvent } from "../src/gateway.js";

describe("GatewayEvent", () => {
    it("should have correct string values", () => {
        assert.equal(GatewayEvent.Ready, "READY");
        assert.equal(GatewayEvent.MessageCreate, "MESSAGE_CREATE");
        assert.equal(GatewayEvent.GuildCreate, "GUILD_CREATE");
        assert.equal(GatewayEvent.InteractionCreate, "INTERACTION_CREATE");
    });

    it("should be iterable with Object.values", () => {
        const events = Object.values(GatewayEvent) as string[];
        assert.ok(events.length > 0);
        assert.ok(events.includes("READY"));
        assert.ok(events.includes("MESSAGE_CREATE"));
        assert.ok(events.includes("GUILD_CREATE"));
        assert.ok(events.includes("INTERACTION_CREATE"));
    });

    it("should contain all expected events", () => {
        const events = Object.values(GatewayEvent) as string[];
        const expected = [
            "READY", "RESUMED",
            "CHANNEL_CREATE", "CHANNEL_UPDATE", "CHANNEL_DELETE", "CHANNEL_PINS_UPDATE",
            "GUILD_CREATE", "GUILD_UPDATE", "GUILD_DELETE",
            "GUILD_BAN_ADD", "GUILD_BAN_REMOVE", "GUILD_EMOJIS_UPDATE",
            "GUILD_MEMBER_ADD", "GUILD_MEMBER_REMOVE", "GUILD_MEMBER_UPDATE", "GUILD_MEMBERS_CHUNK",
            "GUILD_ROLE_CREATE", "GUILD_ROLE_UPDATE", "GUILD_ROLE_DELETE",
            "MESSAGE_CREATE", "MESSAGE_UPDATE", "MESSAGE_DELETE", "MESSAGE_DELETE_BULK",
            "MESSAGE_REACTION_ADD", "MESSAGE_REACTION_REMOVE",
            "PRESENCE_UPDATE", "TYPING_START",
            "USER_UPDATE",
            "VOICE_STATE_UPDATE", "VOICE_SERVER_UPDATE",
            "INTERACTION_CREATE",
            // Thread events
            "THREAD_CREATE", "THREAD_UPDATE", "THREAD_DELETE",
            "THREAD_LIST_SYNC", "THREAD_MEMBER_UPDATE", "THREAD_MEMBERS_UPDATE",
            // Stage events
            "STAGE_INSTANCE_CREATE", "STAGE_INSTANCE_UPDATE", "STAGE_INSTANCE_DELETE",
            // Scheduled events
            "GUILD_SCHEDULED_EVENT_CREATE", "GUILD_SCHEDULED_EVENT_UPDATE", "GUILD_SCHEDULED_EVENT_DELETE",
            "GUILD_SCHEDULED_EVENT_USER_ADD", "GUILD_SCHEDULED_EVENT_USER_REMOVE",
            // Auto Moderation
            "AUTO_MODERATION_RULE_CREATE", "AUTO_MODERATION_RULE_UPDATE", "AUTO_MODERATION_RULE_DELETE",
            "AUTO_MODERATION_ACTION_EXECUTION",
            // Invites
            "INVITE_CREATE", "INVITE_DELETE",
            // Reactions (additional)
            "MESSAGE_REACTION_REMOVE_ALL", "MESSAGE_REACTION_REMOVE_EMOJI",
            // Misc
            "GUILD_STICKERS_UPDATE", "WEBHOOKS_UPDATE", "GUILD_INTEGRATIONS_UPDATE",
            // Audit Log
            "GUILD_AUDIT_LOG_ENTRY_CREATE",
            // Polls
            "MESSAGE_POLL_VOTE_ADD", "MESSAGE_POLL_VOTE_REMOVE",
        ];

        for (const event of expected) {
            assert.ok(events.includes(event), `Missing event: ${event}`);
        }

        assert.equal(events.length, expected.length);
    });
});
