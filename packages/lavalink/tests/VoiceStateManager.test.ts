import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { VoiceStateManager } from "../src/VoiceStateManager.js";
import type { APIVoiceState, GatewayVoiceServerUpdateData } from "@volundr/types";

function makeVoiceState(guildId: string, sessionId: string, channelId: string | null = "vc1"): APIVoiceState {
    return {
        guild_id: guildId,
        channel_id: channelId,
        user_id: "bot1",
        session_id: sessionId,
        deaf: false,
        mute: false,
        self_deaf: true,
        self_mute: false,
        self_video: false,
        suppress: false,
        request_to_speak_timestamp: null,
        member: undefined as never,
    } as APIVoiceState;
}

function makeVoiceServer(guildId: string, token = "tok", endpoint = "voice.discord.gg"): GatewayVoiceServerUpdateData {
    return { guild_id: guildId, token, endpoint };
}

describe("VoiceStateManager", () => {
    it("should resolve when both events arrive (state first)", async () => {
        const mgr = new VoiceStateManager();

        const promise = mgr.waitForVoice("g1");

        mgr.handleVoiceStateUpdate(makeVoiceState("g1", "sess1", "vc1"));
        mgr.handleVoiceServerUpdate(makeVoiceServer("g1", "tok1", "us-east.discord.gg"));

        const result = await promise;
        assert.equal(result.sessionId, "sess1");
        assert.equal(result.token, "tok1");
        assert.equal(result.endpoint, "us-east.discord.gg");
        assert.equal(result.channelId, "vc1");
    });

    it("should resolve when both events arrive (server first)", async () => {
        const mgr = new VoiceStateManager();

        const promise = mgr.waitForVoice("g1");

        mgr.handleVoiceServerUpdate(makeVoiceServer("g1", "tok2", "eu-west.discord.gg"));
        mgr.handleVoiceStateUpdate(makeVoiceState("g1", "sess2", "vc2"));

        const result = await promise;
        assert.equal(result.sessionId, "sess2");
        assert.equal(result.token, "tok2");
        assert.equal(result.endpoint, "eu-west.discord.gg");
        assert.equal(result.channelId, "vc2");
    });

    it("should resolve when events arrive before waitForVoice", async () => {
        const mgr = new VoiceStateManager();

        mgr.handleVoiceStateUpdate(makeVoiceState("g1", "sess3", "vc3"));
        mgr.handleVoiceServerUpdate(makeVoiceServer("g1", "tok3", "brazil.discord.gg"));

        const result = await mgr.waitForVoice("g1");
        assert.equal(result.sessionId, "sess3");
        assert.equal(result.token, "tok3");
        assert.equal(result.endpoint, "brazil.discord.gg");
        assert.equal(result.channelId, "vc3");
    });

    it("should not resolve without endpoint", () => {
        const mgr = new VoiceStateManager();
        let resolved = false;

        mgr.waitForVoice("g1").then(() => { resolved = true; });

        mgr.handleVoiceStateUpdate(makeVoiceState("g1", "sess1", "vc1"));
        mgr.handleVoiceServerUpdate({ guild_id: "g1", token: "tok", endpoint: null } as GatewayVoiceServerUpdateData);

        assert.equal(resolved, false);
    });

    it("should not resolve without channelId", () => {
        const mgr = new VoiceStateManager();
        let resolved = false;

        mgr.waitForVoice("g1").then(() => { resolved = true; });

        mgr.handleVoiceStateUpdate(makeVoiceState("g1", "sess1", null));
        mgr.handleVoiceServerUpdate(makeVoiceServer("g1"));

        assert.equal(resolved, false);
    });

    it("should handle multiple guilds independently", async () => {
        const mgr = new VoiceStateManager();

        const p1 = mgr.waitForVoice("g1");
        const p2 = mgr.waitForVoice("g2");

        mgr.handleVoiceStateUpdate(makeVoiceState("g2", "sessB", "vcB"));
        mgr.handleVoiceServerUpdate(makeVoiceServer("g2", "tokB", "eu.discord.gg"));

        const r2 = await p2;
        assert.equal(r2.sessionId, "sessB");
        assert.equal(r2.token, "tokB");

        mgr.handleVoiceStateUpdate(makeVoiceState("g1", "sessA", "vcA"));
        mgr.handleVoiceServerUpdate(makeVoiceServer("g1", "tokA", "us.discord.gg"));

        const r1 = await p1;
        assert.equal(r1.sessionId, "sessA");
        assert.equal(r1.token, "tokA");
    });

    it("should ignore voice state without guild_id", () => {
        const mgr = new VoiceStateManager();
        let resolved = false;

        mgr.waitForVoice("g1").then(() => { resolved = true; });

        const state = makeVoiceState("g1", "sess1", "vc1");
        (state as { guild_id?: string }).guild_id = undefined;
        mgr.handleVoiceStateUpdate(state);
        mgr.handleVoiceServerUpdate(makeVoiceServer("g1"));

        assert.equal(resolved, false);
    });

    it("should clear pending state", () => {
        const mgr = new VoiceStateManager();
        let resolved = false;

        mgr.waitForVoice("g1").then(() => { resolved = true; });

        mgr.handleVoiceStateUpdate(makeVoiceState("g1", "sess1", "vc1"));
        mgr.clear("g1");
        mgr.handleVoiceServerUpdate(makeVoiceServer("g1"));

        assert.equal(resolved, false);
    });
});
