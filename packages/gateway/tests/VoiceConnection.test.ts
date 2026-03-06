import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { VoiceConnection } from "../src/voice/VoiceConnection.js";

describe("VoiceConnection", () => {
    it("should send gateway op 4 when joining a channel", () => {
        const sent: { guildId: string; channelId: string | null; selfMute: boolean; selfDeaf: boolean }[] = [];
        const conn = new VoiceConnection("guild123", "user456", (g, c, m, d) => {
            sent.push({ guildId: g, channelId: c, selfMute: m, selfDeaf: d });
        });

        conn.joinChannel("channel789");
        assert.equal(sent.length, 1);
        assert.equal(sent[0].guildId, "guild123");
        assert.equal(sent[0].channelId, "channel789");
        assert.equal(sent[0].selfMute, false);
        assert.equal(sent[0].selfDeaf, false);
    });

    it("should send null channel_id when leaving", () => {
        const sent: { channelId: string | null }[] = [];
        const conn = new VoiceConnection("guild123", "user456", (_g, c, _m, _d) => {
            sent.push({ channelId: c });
        });

        conn.leaveChannel();
        assert.equal(sent.length, 1);
        assert.equal(sent[0].channelId, null);
    });

    it("should support selfMute and selfDeaf options", () => {
        const sent: { selfMute: boolean; selfDeaf: boolean }[] = [];
        const conn = new VoiceConnection("guild123", "user456", (_g, _c, m, d) => {
            sent.push({ selfMute: m, selfDeaf: d });
        });

        conn.joinChannel("channel789", true, true);
        assert.equal(sent[0].selfMute, true);
        assert.equal(sent[0].selfDeaf, true);
    });

    it("should start with disconnected status", () => {
        const conn = new VoiceConnection("guild123", "user456", () => {});
        assert.equal(conn.getStatus(), "disconnected");
    });

    it("should emit status when joining", () => {
        const statuses: string[] = [];
        const conn = new VoiceConnection("guild123", "user456", () => {});
        conn.on("status", (s) => statuses.push(s));

        conn.joinChannel("channel789");
        assert.ok(statuses.includes("connecting"));
    });

    it("should handle voice state update with null channel_id as disconnect", () => {
        const conn = new VoiceConnection("guild123", "user456", () => {});
        conn.joinChannel("channel789");

        const statuses: string[] = [];
        conn.on("status", (s) => statuses.push(s));

        conn.handleVoiceStateUpdate({
            guild_id: "guild123",
            channel_id: null,
            user_id: "user456",
            session_id: "sess",
            deaf: false,
            mute: false,
            self_deaf: false,
            self_mute: false,
            self_video: false,
            suppress: false,
            request_to_speak_timestamp: null,
        });

        assert.ok(statuses.includes("disconnected"));
    });
});
