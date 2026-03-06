import { describe, it, beforeEach, mock } from "node:test";
import assert from "node:assert/strict";
import { LavalinkPlayer } from "../src/LavalinkPlayer.js";
import type { LavalinkNode } from "../src/LavalinkNode.js";
import type { LavalinkPlayerData, VoiceUpdateData, UpdatePlayerOptions, TrackStartEvent, TrackEndEvent, TrackExceptionEvent, TrackStuckEvent, WebSocketClosedEvent, LavalinkTrack } from "../src/types.js";

type MockFn<F extends (...args: never[]) => unknown> = F & { mock: { calls: { arguments: Parameters<F> }[] } };

const MOCK_TRACK: LavalinkTrack = {
    encoded: "QAABcg==",
    info: {
        identifier: "dQw4w9WgXcQ",
        isSeekable: true,
        author: "Rick Astley",
        length: 213000,
        isStream: false,
        position: 0,
        title: "Never Gonna Give You Up",
        uri: "https://youtube.com/watch?v=dQw4w9WgXcQ",
        artworkUrl: null,
        isrc: null,
        sourceName: "youtube",
    },
    pluginInfo: {},
    userData: {},
};

function makePlayerResponse(overrides?: Partial<LavalinkPlayerData>): LavalinkPlayerData {
    return {
        guildId: "g1",
        track: MOCK_TRACK,
        volume: 100,
        paused: false,
        state: { time: Date.now(), position: 0, connected: true, ping: 10 },
        voice: { token: "tok", endpoint: "voice.discord.gg", sessionId: "sess", channelId: "vc1" },
        filters: {},
        ...overrides,
    };
}

function makeMockNode(sessionId = "sess1"): LavalinkNode {
    return {
        sessionId,
        rest: {
            updatePlayer: mock.fn(async () => makePlayerResponse()),
            destroyPlayer: mock.fn(async () => {}),
            loadTracks: mock.fn(async () => ({ loadType: "empty", data: {} })),
        },
    } as unknown as LavalinkNode;
}

type SendVoiceUpdateFn = (guildId: string, channelId: string | null) => void;
type WaitForVoiceFn = (guildId: string) => Promise<VoiceUpdateData>;
type UpdatePlayerFn = (sid: string, gid: string, data: UpdatePlayerOptions, noReplace?: boolean) => Promise<LavalinkPlayerData>;
type DestroyPlayerFn = (sid: string, gid: string) => Promise<void>;
type LoadTracksFn = (id: string) => Promise<unknown>;

describe("LavalinkPlayer", () => {
    let player: LavalinkPlayer;
    let node: LavalinkNode;
    let sendVoiceUpdate: MockFn<SendVoiceUpdateFn>;
    let waitForVoice: MockFn<WaitForVoiceFn>;

    beforeEach(() => {
        node = makeMockNode();
        sendVoiceUpdate = mock.fn<SendVoiceUpdateFn>(() => {});
        waitForVoice = mock.fn<WaitForVoiceFn>(async () => ({
            token: "tok",
            endpoint: "voice.discord.gg",
            sessionId: "sess",
            channelId: "vc1",
        }));
        player = new LavalinkPlayer("g1", node, sendVoiceUpdate, waitForVoice);
    });

    it("should initialize with correct defaults", () => {
        assert.equal(player.guildId, "g1");
        assert.equal(player.getStatus(), "idle");
        assert.equal(player.track, null);
        assert.equal(player.volume, 100);
        assert.equal(player.paused, false);
        assert.equal(player.channelId, null);
        assert.equal(player.voiceData, null);
    });

    it("should connect to a voice channel", async () => {
        await player.connect("vc1");

        assert.equal(sendVoiceUpdate.mock.calls.length, 1);
        assert.equal(sendVoiceUpdate.mock.calls[0].arguments[0], "g1");
        assert.equal(sendVoiceUpdate.mock.calls[0].arguments[1], "vc1");
        assert.equal(waitForVoice.mock.calls.length, 1);
        assert.equal(player.channelId, "vc1");
        assert.ok(player.voiceData);
    });

    it("should disconnect from voice", async () => {
        await player.connect("vc1");
        await player.disconnect();

        assert.equal(sendVoiceUpdate.mock.calls.length, 2);
        assert.equal(sendVoiceUpdate.mock.calls[1].arguments[1], null);
        assert.equal(player.channelId, null);
    });

    it("should play a track by encoded string", async () => {
        await player.play("QAABcg==");

        const updateFn = node.rest.updatePlayer as unknown as MockFn<UpdatePlayerFn>;
        assert.equal(updateFn.mock.calls.length, 1);
        const body = updateFn.mock.calls[0].arguments[2];
        assert.deepEqual(body.track, { encoded: "QAABcg==" });
        assert.equal(player.getStatus(), "playing");
    });

    it("should play a track by LavalinkTrack object", async () => {
        await player.play(MOCK_TRACK);

        const updateFn = node.rest.updatePlayer as unknown as MockFn<UpdatePlayerFn>;
        const body = updateFn.mock.calls[0].arguments[2];
        assert.deepEqual(body.track, { encoded: "QAABcg==" });
    });

    it("should play with options", async () => {
        await player.play("enc", { startTime: 1000, endTime: 5000, volume: 50, paused: true, noReplace: true });

        const updateFn = node.rest.updatePlayer as unknown as MockFn<UpdatePlayerFn>;
        const body = updateFn.mock.calls[0].arguments[2];
        assert.equal(body.position, 1000);
        assert.equal(body.endTime, 5000);
        assert.equal(body.volume, 50);
        assert.equal(body.paused, true);
        assert.equal(updateFn.mock.calls[0].arguments[3], true); // noReplace
        assert.equal(player.getStatus(), "paused");
    });

    it("should stop playback", async () => {
        await player.play("enc");
        await player.stop();

        assert.equal(player.track, null);
        assert.equal(player.getStatus(), "idle");
    });

    it("should set paused state", async () => {
        await player.play("enc");
        await player.setPaused(true);

        assert.equal(player.paused, true);
        assert.equal(player.getStatus(), "paused");

        await player.setPaused(false);
        assert.equal(player.paused, false);
        assert.equal(player.getStatus(), "playing");
    });

    it("should seek to position", async () => {
        await player.seek(30000);

        const updateFn = node.rest.updatePlayer as unknown as MockFn<UpdatePlayerFn>;
        const body = updateFn.mock.calls[0].arguments[2];
        assert.equal(body.position, 30000);
    });

    it("should set volume", async () => {
        await player.setVolume(50);

        assert.equal(player.volume, 50);
        const updateFn = node.rest.updatePlayer as unknown as MockFn<UpdatePlayerFn>;
        const body = updateFn.mock.calls[0].arguments[2];
        assert.equal(body.volume, 50);
    });

    it("should set filters", async () => {
        const filters = { timescale: { speed: 1.5 } };
        await player.setFilters(filters);

        assert.deepEqual(player.filters, filters);
    });

    it("should clear filters", async () => {
        await player.setFilters({ timescale: { speed: 1.5 } });
        await player.clearFilters();

        assert.deepEqual(player.filters, {});
    });

    it("should search via node rest", async () => {
        await player.search("ytsearch:test");

        const loadFn = node.rest.loadTracks as unknown as MockFn<LoadTracksFn>;
        assert.equal(loadFn.mock.calls.length, 1);
        assert.equal(loadFn.mock.calls[0].arguments[0], "ytsearch:test");
    });

    it("should throw when node has no sessionId", async () => {
        (node as unknown as { sessionId: null }).sessionId = null;
        await assert.rejects(() => player.play("enc"), /no sessionId/);
    });

    it("should get estimated position when playing", () => {
        const now = Date.now();
        player.state = { time: now - 1000, position: 5000, connected: true, ping: 10 };
        (player as unknown as { status: string }).status = "playing";

        const pos = player.getPosition();
        assert.ok(pos >= 5900 && pos <= 6100, `Expected ~6000, got ${pos}`);
    });

    it("should return raw position when paused", () => {
        player.state = { time: Date.now() - 5000, position: 5000, connected: true, ping: 10 };
        player.paused = true;

        assert.equal(player.getPosition(), 5000);
    });

    it("should return raw position when disconnected", () => {
        player.state = { time: Date.now() - 5000, position: 5000, connected: false, ping: -1 };

        assert.equal(player.getPosition(), 5000);
    });

    // --- Event handling ---

    it("should handle TrackStartEvent", () => {
        const events: TrackStartEvent[] = [];
        player.on("trackStart", (e) => events.push(e));

        const event: TrackStartEvent = {
            op: "event", guildId: "g1", type: "TrackStartEvent", track: MOCK_TRACK,
        };
        player._handleEvent(event);

        assert.equal(events.length, 1);
        assert.equal(player.track, MOCK_TRACK);
        assert.equal(player.getStatus(), "playing");
    });

    it("should handle TrackEndEvent", () => {
        const events: TrackEndEvent[] = [];
        player.on("trackEnd", (e) => events.push(e));

        player.track = MOCK_TRACK;
        const event: TrackEndEvent = {
            op: "event", guildId: "g1", type: "TrackEndEvent", track: MOCK_TRACK, reason: "finished",
        };
        player._handleEvent(event);

        assert.equal(events.length, 1);
        assert.equal(player.track, null);
        assert.equal(player.getStatus(), "idle");
    });

    it("should handle TrackExceptionEvent", () => {
        const events: TrackExceptionEvent[] = [];
        player.on("trackException", (e) => events.push(e));

        const event: TrackExceptionEvent = {
            op: "event", guildId: "g1", type: "TrackExceptionEvent",
            track: MOCK_TRACK, exception: { message: "fail", severity: "common", cause: "test" },
        };
        player._handleEvent(event);

        assert.equal(events.length, 1);
    });

    it("should handle TrackStuckEvent", () => {
        const events: TrackStuckEvent[] = [];
        player.on("trackStuck", (e) => events.push(e));

        const event: TrackStuckEvent = {
            op: "event", guildId: "g1", type: "TrackStuckEvent",
            track: MOCK_TRACK, thresholdMs: 10000,
        };
        player._handleEvent(event);

        assert.equal(events.length, 1);
    });

    it("should handle WebSocketClosedEvent", () => {
        const events: WebSocketClosedEvent[] = [];
        player.on("webSocketClosed", (e) => events.push(e));

        const event: WebSocketClosedEvent = {
            op: "event", guildId: "g1", type: "WebSocketClosedEvent",
            code: 4006, reason: "session invalid", byRemote: true,
        };
        player._handleEvent(event);

        assert.equal(events.length, 1);
    });

    it("should handle playerUpdate", () => {
        const states: unknown[] = [];
        player.on("playerUpdate", (s) => states.push(s));

        const state = { time: Date.now(), position: 15000, connected: true, ping: 5 };
        player._handlePlayerUpdate(state);

        assert.deepEqual(player.state, state);
        assert.equal(states.length, 1);
    });

    it("should destroy player", async () => {
        await player.destroy();

        assert.equal(player.getStatus(), "destroyed");
        assert.equal(player.channelId, null);
        assert.equal(sendVoiceUpdate.mock.calls.length, 1);
        assert.equal(sendVoiceUpdate.mock.calls[0].arguments[1], null);

        const destroyFn = node.rest.destroyPlayer as unknown as MockFn<DestroyPlayerFn>;
        assert.equal(destroyFn.mock.calls.length, 1);
    });

    it("should not destroy twice", async () => {
        await player.destroy();
        await player.destroy();

        const destroyFn = node.rest.destroyPlayer as unknown as MockFn<DestroyPlayerFn>;
        assert.equal(destroyFn.mock.calls.length, 1);
    });
});
