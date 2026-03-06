import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { Partials, hasPartial } from "../src/utils/Partials.js";

describe("Partials", () => {
    it("should define all partial types", () => {
        assert.equal(typeof Partials.User, "number");
        assert.equal(typeof Partials.Channel, "number");
        assert.equal(typeof Partials.GuildMember, "number");
        assert.equal(typeof Partials.Message, "number");
        assert.equal(typeof Partials.Reaction, "number");
        assert.equal(typeof Partials.ThreadMember, "number");
    });

    it("should have unique values", () => {
        const values = Object.values(Partials);
        const unique = new Set(values);
        assert.equal(values.length, unique.size);
    });

    it("hasPartial should return true when type is in the array", () => {
        assert.ok(hasPartial([Partials.User, Partials.Message], Partials.User));
        assert.ok(hasPartial([Partials.User, Partials.Message], Partials.Message));
    });

    it("hasPartial should return false when type is not in the array", () => {
        assert.ok(!hasPartial([Partials.User], Partials.Channel));
        assert.ok(!hasPartial([], Partials.User));
    });

    it("should work with all partial types enabled", () => {
        const all = Object.values(Partials);
        for (const type of all) {
            assert.ok(hasPartial(all, type));
        }
    });
});
