import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { Collection } from "../src/collection/Collection.js";

describe("Collection", () => {
    function make() {
        const c = new Collection<string, number>();
        c.set("a", 1);
        c.set("b", 2);
        c.set("c", 3);
        return c;
    }

    describe("find / findKey", () => {
        it("should find a value by predicate", () => {
            assert.equal(make().find((v) => v === 2), 2);
        });

        it("should return undefined when not found", () => {
            assert.equal(make().find((v) => v === 99), undefined);
        });

        it("should find a key by predicate", () => {
            assert.equal(make().findKey((v) => v === 3), "c");
        });

        it("should return undefined for missing key", () => {
            assert.equal(make().findKey((v) => v === 99), undefined);
        });
    });

    describe("filter", () => {
        it("should return a new filtered Collection", () => {
            const filtered = make().filter((v) => v > 1);
            assert.equal(filtered.size, 2);
            assert.ok(!filtered.has("a"));
            assert.ok(filtered.has("b"));
            assert.ok(filtered.has("c"));
        });

        it("should return empty Collection when nothing matches", () => {
            assert.equal(make().filter((v) => v > 100).size, 0);
        });
    });

    describe("map", () => {
        it("should map values to an array", () => {
            assert.deepEqual(make().map((v) => v * 2), [2, 4, 6]);
        });

        it("should return empty array for empty Collection", () => {
            assert.deepEqual(new Collection().map((v) => v), []);
        });
    });

    describe("mapValues", () => {
        it("should map values preserving keys", () => {
            const mapped = make().mapValues((v) => v * 10);
            assert.equal(mapped.get("a"), 10);
            assert.equal(mapped.get("c"), 30);
        });
    });

    describe("some / every", () => {
        it("some should return true when at least one matches", () => {
            assert.ok(make().some((v) => v === 2));
        });

        it("some should return false when none match", () => {
            assert.ok(!make().some((v) => v === 99));
        });

        it("every should return true when all match", () => {
            assert.ok(make().every((v) => v > 0));
        });

        it("every should return false when one fails", () => {
            assert.ok(!make().every((v) => v > 1));
        });
    });

    describe("sweep", () => {
        it("should remove matching entries and return count", () => {
            const c = make();
            const swept = c.sweep((v) => v < 3);
            assert.equal(swept, 2);
            assert.equal(c.size, 1);
            assert.ok(c.has("c"));
        });

        it("should return 0 when nothing swept", () => {
            assert.equal(make().sweep((v) => v > 100), 0);
        });
    });

    describe("reduce", () => {
        it("should reduce to a single value", () => {
            assert.equal(make().reduce((acc, v) => acc + v, 0), 6);
        });

        it("should work with string accumulator", () => {
            assert.equal(make().reduce((acc, _, k) => acc + k, ""), "abc");
        });
    });

    describe("first / last / at", () => {
        it("first() should return the first value", () => {
            assert.equal(make().first(), 1);
        });

        it("first(2) should return first 2 values", () => {
            assert.deepEqual(make().first(2), [1, 2]);
        });

        it("last() should return the last value", () => {
            assert.equal(make().last(), 3);
        });

        it("last(2) should return last 2 values", () => {
            assert.deepEqual(make().last(2), [2, 3]);
        });

        it("at(0) should return first value", () => {
            assert.equal(make().at(0), 1);
        });

        it("at(-1) should return last value", () => {
            assert.equal(make().at(-1), 3);
        });

        it("keyAt(1) should return second key", () => {
            assert.equal(make().keyAt(1), "b");
        });
    });

    describe("random", () => {
        it("should return a value from the collection", () => {
            const c = make();
            const val = c.random();
            assert.ok(val !== undefined);
            assert.ok([1, 2, 3].includes(val));
        });

        it("random(2) should return 2 items", () => {
            assert.equal(make().random(2).length, 2);
        });

        it("should return undefined for empty collection", () => {
            assert.equal(new Collection().random(), undefined);
        });
    });

    describe("array / keyArray / toJSON", () => {
        it("array() should return values as array", () => {
            assert.deepEqual(make().array(), [1, 2, 3]);
        });

        it("keyArray() should return keys as array", () => {
            assert.deepEqual(make().keyArray(), ["a", "b", "c"]);
        });

        it("toJSON() should equal array()", () => {
            const c = make();
            assert.deepEqual(c.toJSON(), c.array());
        });
    });

    describe("sort", () => {
        it("should return a sorted Collection", () => {
            const c = make();
            const sorted = c.sort((a, b) => b - a);
            assert.deepEqual(sorted.array(), [3, 2, 1]);
        });
    });

    describe("clone / concat", () => {
        it("clone should create a shallow copy", () => {
            const c = make();
            const cloned = c.clone();
            assert.notStrictEqual(c, cloned);
            assert.equal(cloned.size, c.size);
            assert.equal(cloned.get("a"), 1);
        });

        it("concat should merge collections", () => {
            const c1 = make();
            const c2 = new Collection<string, number>([["d", 4], ["e", 5]]);
            const merged = c1.concat(c2);
            assert.equal(merged.size, 5);
            assert.equal(merged.get("d"), 4);
        });

        it("concat should overwrite with later values", () => {
            const c1 = make();
            const c2 = new Collection<string, number>([["a", 99]]);
            const merged = c1.concat(c2);
            assert.equal(merged.get("a"), 99);
        });
    });

    describe("partition", () => {
        it("should split into two collections", () => {
            const [yes, no] = make().partition((v) => v > 1);
            assert.equal(yes.size, 2);
            assert.equal(no.size, 1);
            assert.ok(no.has("a"));
        });
    });

    describe("each / tap", () => {
        it("each should iterate and return this", () => {
            const c = make();
            const keys: string[] = [];
            const result = c.each((_, k) => keys.push(k));
            assert.strictEqual(result, c);
            assert.deepEqual(keys, ["a", "b", "c"]);
        });

        it("tap should run side-effect and return this", () => {
            const c = make();
            let tapped = false;
            const result = c.tap(() => { tapped = true; });
            assert.strictEqual(result, c);
            assert.ok(tapped);
        });
    });

    describe("hasAll / hasAny", () => {
        it("hasAll should return true when all keys present", () => {
            assert.ok(make().hasAll("a", "b"));
        });

        it("hasAll should return false when a key is missing", () => {
            assert.ok(!make().hasAll("a", "z"));
        });

        it("hasAny should return true when any key present", () => {
            assert.ok(make().hasAny("z", "a"));
        });

        it("hasAny should return false when no keys present", () => {
            assert.ok(!make().hasAny("x", "y"));
        });
    });

    describe("difference / intersect", () => {
        it("difference should return entries not in other", () => {
            const c1 = make();
            const c2 = new Collection<string, number>([["a", 1], ["b", 2]]);
            const diff = c1.difference(c2);
            assert.equal(diff.size, 1);
            assert.ok(diff.has("c"));
        });

        it("intersect should return entries in both", () => {
            const c1 = make();
            const c2 = new Collection<string, number>([["b", 2], ["d", 4]]);
            const inter = c1.intersect(c2);
            assert.equal(inter.size, 1);
            assert.ok(inter.has("b"));
        });
    });

    describe("flatMap", () => {
        it("should flatten mapped arrays", () => {
            const result = make().flatMap((v) => [v, v * 10]);
            assert.deepEqual(result, [1, 10, 2, 20, 3, 30]);
        });

        it("should return empty array for empty collection", () => {
            assert.deepEqual(new Collection<string, number>().flatMap((v) => [v]), []);
        });
    });

    describe("reverse", () => {
        it("should reverse insertion order", () => {
            const reversed = make().reverse();
            assert.deepEqual(reversed.array(), [3, 2, 1]);
            assert.deepEqual(reversed.keyArray(), ["c", "b", "a"]);
        });

        it("should return a new collection instance", () => {
            const c = make();
            assert.notStrictEqual(c.reverse(), c);
        });
    });

    describe("ensure", () => {
        it("should return existing value for present key", () => {
            const c = make();
            assert.equal(c.ensure("a", () => 99), 1);
            assert.equal(c.get("a"), 1);
        });

        it("should insert and return default for missing key", () => {
            const c = make();
            assert.equal(c.ensure("d", () => 4), 4);
            assert.equal(c.get("d"), 4);
            assert.equal(c.size, 4);
        });

        it("should not call factory for present key", () => {
            let called = false;
            make().ensure("a", () => { called = true; return 99; });
            assert.equal(called, false);
        });
    });

    describe("equals", () => {
        it("should return true for identical collections", () => {
            assert.ok(make().equals(make()));
        });

        it("should return false for different sizes", () => {
            const c2 = new Collection<string, number>([["a", 1]]);
            assert.ok(!make().equals(c2));
        });

        it("should return false for same keys but different values", () => {
            const c2 = new Collection<string, number>([["a", 1], ["b", 2], ["c", 99]]);
            assert.ok(!make().equals(c2));
        });
    });
});
