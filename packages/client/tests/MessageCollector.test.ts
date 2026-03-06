import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { MessageCollector } from "../src/collectors/MessageCollector.js";
import { Message } from "../src/entities/Message.js";
import type { APIMessage } from "@volundr/types";

// Minimal fake client for Message construction
const fakeClient = {} as import("../src/Client.js").Client;

function makeMessage(channelId: string, content: string): Message {
    const raw = {
        id: String(Math.random()),
        channel_id: channelId,
        content,
        author: { id: "1", username: "test", discriminator: "0", global_name: null, bot: false, avatar: null },
        timestamp: new Date().toISOString(),
        edited_timestamp: null,
        tts: false,
        mention_everyone: false,
        mentions: [],
        mention_roles: [],
        attachments: [],
        embeds: [],
        pinned: false,
        type: 0,
    } as APIMessage;
    return new Message(fakeClient, raw);
}

describe("MessageCollector", () => {
    it("should collect messages for the right channel", () => {
        const collector = new MessageCollector("ch1");
        const msg = makeMessage("ch1", "hello");
        collector.handler(msg);
        assert.equal(collector.collected.size, 1);
        assert.equal(collector.collected.first()?.content, "hello");
    });

    it("should ignore messages from other channels", () => {
        const collector = new MessageCollector("ch1");
        collector.handler(makeMessage("ch2", "nope"));
        assert.equal(collector.collected.size, 0);
    });

    it("should apply filter", () => {
        const collector = new MessageCollector("ch1", {
            filter: (msg) => msg.content === "yes",
        });

        collector.handler(makeMessage("ch1", "no"));
        collector.handler(makeMessage("ch1", "yes"));
        assert.equal(collector.collected.size, 1);
    });

    it("should stop after max messages", () => {
        const collector = new MessageCollector("ch1", { max: 2 });
        let endCalled = false;

        collector.on("end", () => { endCalled = true; });

        collector.handler(makeMessage("ch1", "1"));
        collector.handler(makeMessage("ch1", "2"));
        collector.handler(makeMessage("ch1", "3"));

        assert.equal(collector.collected.size, 2);
        assert.equal(collector.isEnded, true);
        assert.equal(endCalled, true);
    });

    it("should emit collect event", () => {
        const collector = new MessageCollector("ch1");
        const collected: Message[] = [];

        collector.on("collect", (msg: Message) => collected.push(msg));

        collector.handler(makeMessage("ch1", "a"));
        collector.handler(makeMessage("ch1", "b"));

        assert.equal(collected.length, 2);
    });

    it("should stop manually", () => {
        const collector = new MessageCollector("ch1");
        let reason = "";

        collector.on("end", (_: unknown, r: string) => { reason = r; });
        collector.stop("user");

        assert.equal(collector.isEnded, true);
        assert.equal(reason, "user");
    });

    it("should not collect after being stopped", () => {
        const collector = new MessageCollector("ch1");
        collector.stop();
        collector.handler(makeMessage("ch1", "after"));
        assert.equal(collector.collected.size, 0);
    });

    it("should auto-stop on timeout", async () => {
        const collector = new MessageCollector("ch1", { time: 50 });

        await new Promise<void>((resolve) => {
            collector.on("end", () => resolve());
        });

        assert.equal(collector.isEnded, true);
    });

    it("should support idle timeout", async () => {
        const collector = new MessageCollector("ch1", { idle: 50 });

        // Collecting a message should reset the idle timer
        collector.handler(makeMessage("ch1", "keep alive"));

        await new Promise<void>((resolve) => {
            collector.on("end", (_: unknown, reason: string) => {
                assert.equal(reason, "idle");
                resolve();
            });
        });

        assert.equal(collector.isEnded, true);
        assert.equal(collector.collected.size, 1);
    });
});
