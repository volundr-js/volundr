import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { CacheStore } from "../src/cache/CacheStore.js";

interface TestItem {
    id: string;
    value: number;
}

describe("CacheStore", () => {
    function createStore(): CacheStore<TestItem> {
        const store = new CacheStore<TestItem>();
        store.set("1", { id: "1", value: 10 });
        store.set("2", { id: "2", value: 20 });
        store.set("3", { id: "3", value: 30 });
        return store;
    }

    it("should find an item", () => {
        const store = createStore();
        const found = store.find((v) => v.value === 20);
        assert.deepEqual(found, { id: "2", value: 20 });
    });

    it("should return undefined when find fails", () => {
        const store = createStore();
        assert.equal(store.find((v) => v.value === 99), undefined);
    });

    it("should filter items", () => {
        const store = createStore();
        const filtered = store.filter((v) => v.value >= 20);
        assert.equal(filtered.length, 2);
    });

    it("should map items", () => {
        const store = createStore();
        const mapped = store.map((v) => v.value * 2);
        assert.deepEqual(mapped, [20, 40, 60]);
    });

    it("should check some", () => {
        const store = createStore();
        assert.equal(store.some((v) => v.value === 30), true);
        assert.equal(store.some((v) => v.value === 99), false);
    });

    it("should check every", () => {
        const store = createStore();
        assert.equal(store.every((v) => v.value > 0), true);
        assert.equal(store.every((v) => v.value > 10), false);
    });

    it("should sweep items", () => {
        const store = createStore();
        const swept = store.sweep((v) => v.value < 20);
        assert.equal(swept, 1);
        assert.equal(store.size, 2);
        assert.equal(store.has("1"), false);
    });

    it("should return first item", () => {
        const store = createStore();
        const first = store.first();
        assert.ok(first);
        assert.equal(first.id, "1");
    });

    it("should return undefined for first on empty store", () => {
        const store = new CacheStore<TestItem>();
        assert.equal(store.first(), undefined);
    });

    it("should convert to array", () => {
        const store = createStore();
        const arr = store.array();
        assert.equal(arr.length, 3);
    });
});
