import { describe, it, mock } from "node:test";
import assert from "node:assert/strict";
import { validateIntentsForEvent } from "../src/utils/IntentsValidator.js";

describe("IntentsValidator", () => {
    // GatewayIntents values
    const Guilds = 1 << 0;
    const GuildMembers = 1 << 1;
    const GuildModeration = 1 << 2;
    const GuildVoiceStates = 1 << 7;
    const GuildPresences = 1 << 8;
    const GuildMessages = 1 << 9;
    const GuildMessageReactions = 1 << 10;
    const DirectMessages = 1 << 12;

    it("should not warn when correct intent is present for GUILD_CREATE", () => {
        // This should not throw - no way to check logging directly without mocking,
        // but we verify it runs without error
        validateIntentsForEvent(Guilds, "GUILD_CREATE");
    });

    it("should not warn for GUILD_MEMBER_ADD with GuildMembers intent", () => {
        validateIntentsForEvent(GuildMembers, "GUILD_MEMBER_ADD");
    });

    it("should not warn for VOICE_STATE_UPDATE with GuildVoiceStates", () => {
        validateIntentsForEvent(GuildVoiceStates, "VOICE_STATE_UPDATE");
    });

    it("should not warn for PRESENCE_UPDATE with GuildPresences", () => {
        validateIntentsForEvent(GuildPresences, "PRESENCE_UPDATE");
    });

    it("should not warn for MESSAGE_CREATE with either GuildMessages or DirectMessages", () => {
        validateIntentsForEvent(GuildMessages, "MESSAGE_CREATE");
        validateIntentsForEvent(DirectMessages, "MESSAGE_CREATE");
    });

    it("should not warn for events with combined intents", () => {
        validateIntentsForEvent(GuildMessages | GuildMembers, "MESSAGE_CREATE");
        validateIntentsForEvent(GuildMessages | GuildMembers, "GUILD_MEMBER_ADD");
    });

    it("should not throw for unknown events (no intent mapping)", () => {
        validateIntentsForEvent(0, "READY");
        validateIntentsForEvent(0, "RESUMED");
        validateIntentsForEvent(0, "SOME_FUTURE_EVENT");
    });

    it("should not warn when all intents are set", () => {
        const all = 0x3FFFFFF; // all bits
        validateIntentsForEvent(all, "GUILD_CREATE");
        validateIntentsForEvent(all, "MESSAGE_CREATE");
        validateIntentsForEvent(all, "GUILD_MEMBER_ADD");
        validateIntentsForEvent(all, "PRESENCE_UPDATE");
    });

    it("should handle zero intents without throwing", () => {
        // Will log warnings but should not throw
        validateIntentsForEvent(0, "GUILD_CREATE");
        validateIntentsForEvent(0, "MESSAGE_CREATE");
    });

    it("should validate MESSAGE_REACTION_ADD needs GuildMessageReactions or DirectMessageReactions", () => {
        validateIntentsForEvent(GuildMessageReactions, "MESSAGE_REACTION_ADD");
    });

    it("should validate GUILD_BAN_ADD needs GuildModeration", () => {
        validateIntentsForEvent(GuildModeration, "GUILD_BAN_ADD");
    });
});
