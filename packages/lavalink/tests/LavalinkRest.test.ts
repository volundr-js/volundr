import { describe, it, beforeEach, afterEach, mock } from "node:test";
import assert from "node:assert/strict";
import { LavalinkRest } from "../src/LavalinkRest.js";

const originalFetch = globalThis.fetch;

function mockFetch(status: number, body: unknown, checkFn?: (url: string, init?: RequestInit) => void) {
    const fn = mock.fn(async (url: string | URL | Request, init?: RequestInit) => {
        if (checkFn) checkFn(url as string, init);
        return {
            ok: status >= 200 && status < 300,
            status,
            statusText: status === 200 ? "OK" : "Error",
            json: async () => body,
            text: async () => JSON.stringify(body),
        } as Response;
    });
    globalThis.fetch = fn as typeof globalThis.fetch;
    return fn;
}

describe("LavalinkRest", () => {
    let rest: LavalinkRest;

    beforeEach(() => {
        rest = new LavalinkRest("localhost", 2333, "testpass", false, "bot123", "volundr/test");
    });

    afterEach(() => {
        globalThis.fetch = originalFetch;
    });

    it("should construct correct base URL", () => {
        const fetchFn = mockFetch(200, { loadType: "empty", data: {} });
        rest.loadTracks("test");
        const calledUrl = fetchFn.mock.calls[0].arguments[0] as string;
        assert.ok(calledUrl.startsWith("http://localhost:2333/"));
    });

    it("should use https when secure is true", () => {
        const secureRest = new LavalinkRest("example.com", 443, "pass", true, "bot1", "test");
        const fetchFn = mockFetch(200, { loadType: "empty", data: {} });
        secureRest.loadTracks("test");
        const calledUrl = fetchFn.mock.calls[0].arguments[0] as string;
        assert.ok(calledUrl.startsWith("https://"));
    });

    it("should set correct headers", async () => {
        mockFetch(200, {}, (_url, init) => {
            const headers = init?.headers as Record<string, string>;
            assert.equal(headers["Authorization"], "testpass");
            assert.equal(headers["User-Id"], "bot123");
            assert.equal(headers["Client-Name"], "volundr/test");
            assert.equal(headers["Content-Type"], "application/json");
        });
        await rest.getInfo();
    });

    it("should encode identifier in loadTracks", async () => {
        const fetchFn = mockFetch(200, { loadType: "search", data: [] });
        await rest.loadTracks("ytsearch:hello world");
        const calledUrl = fetchFn.mock.calls[0].arguments[0] as string;
        assert.ok(calledUrl.includes("ytsearch%3Ahello%20world"));
    });

    it("should POST decodeTracks with body", async () => {
        mockFetch(200, [], (_url, init) => {
            assert.equal(init?.method, "POST");
            assert.equal(init?.body, JSON.stringify(["encoded1", "encoded2"]));
        });
        await rest.decodeTracks(["encoded1", "encoded2"]);
    });

    it("should GET players", async () => {
        const players = [{ guildId: "g1" }];
        mockFetch(200, players);
        const result = await rest.getPlayers("sess1");
        assert.deepEqual(result, players);
    });

    it("should PATCH updatePlayer with noReplace query", async () => {
        const fetchFn = mockFetch(200, { guildId: "g1", volume: 50 });
        await rest.updatePlayer("sess1", "g1", { volume: 50 }, true);
        const calledUrl = fetchFn.mock.calls[0].arguments[0] as string;
        assert.ok(calledUrl.includes("?noReplace=true"));
        const init = fetchFn.mock.calls[0].arguments[1] as RequestInit;
        assert.equal(init.method, "PATCH");
    });

    it("should PATCH updatePlayer without noReplace by default", async () => {
        const fetchFn = mockFetch(200, { guildId: "g1", volume: 100 });
        await rest.updatePlayer("sess1", "g1", { volume: 100 });
        const calledUrl = fetchFn.mock.calls[0].arguments[0] as string;
        assert.ok(!calledUrl.includes("noReplace"));
    });

    it("should DELETE destroyPlayer", async () => {
        mockFetch(204, undefined, (_url, init) => {
            assert.equal(init?.method, "DELETE");
        });
        await rest.destroyPlayer("sess1", "g1");
    });

    it("should PATCH updateSession", async () => {
        mockFetch(204, undefined, (_url, init) => {
            assert.equal(init?.method, "PATCH");
            const body = JSON.parse(init?.body as string);
            assert.equal(body.resuming, true);
            assert.equal(body.timeout, 60);
        });
        await rest.updateSession("sess1", { resuming: true, timeout: 60 });
    });

    it("should throw on HTTP error", async () => {
        mockFetch(500, "Internal Server Error");
        await assert.rejects(() => rest.getInfo(), /REST/);
    });

    it("should throw on PATCH error with body details", async () => {
        globalThis.fetch = (async () => ({
            ok: false,
            status: 400,
            statusText: "Bad Request",
            text: async () => '{"message":"Invalid volume"}',
        })) as unknown as typeof globalThis.fetch;

        await assert.rejects(
            () => rest.updatePlayer("sess1", "g1", { volume: -1 }),
            /400/,
        );
    });

    it("should GET version", async () => {
        mockFetch(200, "4.0.0");
        const version = await rest.getVersion();
        assert.equal(version, "4.0.0");
    });

    it("should GET stats", async () => {
        const stats = { op: "stats", players: 5, playingPlayers: 3, uptime: 1000 };
        mockFetch(200, stats);
        const result = await rest.getStats();
        assert.equal(result.players, 5);
        assert.equal(result.playingPlayers, 3);
    });
});
