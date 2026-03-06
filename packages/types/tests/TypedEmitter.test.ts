import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { TypedEmitter } from "../src/TypedEmitter.js";

interface TestEvents {
    message: string;
    count: number;
    empty: void;
}

describe("TypedEmitter", () => {
    it("should emit and receive typed events", () => {
        const emitter = new TypedEmitter<TestEvents>();
        let received = "";

        emitter.on("message", (data) => {
            received = data;
        });

        emitter.emit("message", "hello");
        assert.equal(received, "hello");
    });

    it("should handle once listeners", () => {
        const emitter = new TypedEmitter<TestEvents>();
        let count = 0;

        emitter.once("count", (data) => {
            count = data;
        });

        emitter.emit("count", 42);
        emitter.emit("count", 99);
        assert.equal(count, 42);
    });

    it("should remove listeners with off", () => {
        const emitter = new TypedEmitter<TestEvents>();
        let received = "";

        const listener = (data: string) => {
            received = data;
        };

        emitter.on("message", listener);
        emitter.emit("message", "first");
        assert.equal(received, "first");

        emitter.off("message", listener);
        emitter.emit("message", "second");
        assert.equal(received, "first");
    });

    it("should handle void events", () => {
        const emitter = new TypedEmitter<TestEvents>();
        let called = false;

        emitter.on("empty", () => {
            called = true;
        });

        emitter.emit("empty", undefined as void);
        assert.equal(called, true);
    });

    it("should support multiple listeners on same event", () => {
        const emitter = new TypedEmitter<TestEvents>();
        const results: string[] = [];

        emitter.on("message", (data) => results.push(`a:${data}`));
        emitter.on("message", (data) => results.push(`b:${data}`));

        emitter.emit("message", "test");
        assert.deepEqual(results, ["a:test", "b:test"]);
    });
});
