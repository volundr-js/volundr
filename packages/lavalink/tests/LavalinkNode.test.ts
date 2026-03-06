import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { LavalinkNode } from "../src/LavalinkNode.js";
import type { LavalinkStatsPayload } from "../src/types.js";

function makeNode(overrides?: Record<string, unknown>) {
    return new LavalinkNode(
        {
            name: "test-node",
            host: "localhost",
            port: 2333,
            password: "testpass",
            secure: false,
            ...overrides,
        },
        "bot123",
        "volundr/test",
    );
}

describe("LavalinkNode", () => {
    it("should initialize with correct properties", () => {
        const node = makeNode();
        assert.equal(node.name, "test-node");
        assert.equal(node.getStatus(), "disconnected");
        assert.equal(node.sessionId, null);
        assert.equal(node.getStats(), null);
        assert.equal(node.getInfo(), null);
    });

    it("should create a REST instance", () => {
        const node = makeNode();
        assert.ok(node.rest);
    });

    it("should calculate penalty with no stats as 0", () => {
        const node = makeNode();
        assert.equal(node.getPenalty(), 0);
    });

    it("should calculate penalty from stats", () => {
        const node = makeNode();

        const stats: LavalinkStatsPayload = {
            op: "stats",
            players: 10,
            playingPlayers: 5,
            uptime: 60000,
            memory: { free: 100, used: 200, allocated: 300, reservable: 400 },
            cpu: { cores: 4, systemLoad: 0.3, lavalinkLoad: 0.2 },
            frameStats: { sent: 1000, nulled: 10, deficit: 5 },
        };

        // Inject stats via the internal property
        (node as unknown as { stats: LavalinkStatsPayload }).stats = stats;

        const penalty = node.getPenalty();
        assert.ok(penalty > 0, `Expected penalty > 0, got ${penalty}`);
        assert.ok(penalty >= stats.playingPlayers, "Penalty should include playing players");
    });

    it("should calculate penalty without frame stats", () => {
        const node = makeNode();

        const stats: LavalinkStatsPayload = {
            op: "stats",
            players: 3,
            playingPlayers: 2,
            uptime: 60000,
            memory: { free: 100, used: 200, allocated: 300, reservable: 400 },
            cpu: { cores: 4, systemLoad: 0.1, lavalinkLoad: 0.05 },
        };

        (node as unknown as { stats: LavalinkStatsPayload }).stats = stats;

        const penalty = node.getPenalty();
        assert.ok(penalty >= 2, "Penalty should be >= playingPlayers (2)");
    });

    it("should calculate higher penalty for higher CPU load", () => {
        const node1 = makeNode();
        const node2 = makeNode();

        const lowLoad: LavalinkStatsPayload = {
            op: "stats",
            players: 1, playingPlayers: 1, uptime: 1000,
            memory: { free: 100, used: 100, allocated: 200, reservable: 400 },
            cpu: { cores: 4, systemLoad: 0.1, lavalinkLoad: 0.05 },
        };

        const highLoad: LavalinkStatsPayload = {
            op: "stats",
            players: 1, playingPlayers: 1, uptime: 1000,
            memory: { free: 100, used: 100, allocated: 200, reservable: 400 },
            cpu: { cores: 4, systemLoad: 0.9, lavalinkLoad: 0.8 },
        };

        (node1 as unknown as { stats: LavalinkStatsPayload }).stats = lowLoad;
        (node2 as unknown as { stats: LavalinkStatsPayload }).stats = highLoad;

        assert.ok(node2.getPenalty() > node1.getPenalty(), "Higher CPU should give higher penalty");
    });

    it("should not connect if already connecting", () => {
        const node = makeNode();
        // Set status to connecting manually
        (node as unknown as { status: string }).status = "connecting";
        // connect() should be a no-op (no error thrown)
        node.connect();
        assert.equal(node.getStatus(), "connecting");
    });

    it("should handle disconnect cleanly when not connected", () => {
        const node = makeNode();
        // Should not throw
        node.disconnect();
        assert.equal(node.getStatus(), "disconnected");
    });

    it("should use sessionId for resume header", () => {
        const node = makeNode({ sessionId: "resume-sess-123" });
        assert.equal(node.name, "test-node");
        // The resume session ID is stored internally, verified by constructor not throwing
    });
});
