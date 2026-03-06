import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { Permissions, PermissionFlags } from "../src/permissions/Permissions.js";

describe("Permissions", () => {
    it("should construct from bigint", () => {
        const p = new Permissions(PermissionFlags.SendMessages);
        assert.equal(p.has(PermissionFlags.SendMessages), true);
        assert.equal(p.has(PermissionFlags.BanMembers), false);
    });

    it("should construct from string", () => {
        const p = new Permissions("2048");
        assert.equal(p.has(PermissionFlags.SendMessages), true);
    });

    it("should construct from number", () => {
        const p = new Permissions(2048);
        assert.equal(p.has(PermissionFlags.SendMessages), true);
    });

    it("administrator should bypass all checks", () => {
        const p = new Permissions(PermissionFlags.Administrator);
        assert.equal(p.has(PermissionFlags.BanMembers), true);
        assert.equal(p.has(PermissionFlags.ManageGuild), true);
        assert.equal(p.has(PermissionFlags.ManageRoles), true);
    });

    it("should add permissions", () => {
        const p = new Permissions(0n)
            .add(PermissionFlags.SendMessages, PermissionFlags.ViewChannel);

        assert.equal(p.has(PermissionFlags.SendMessages), true);
        assert.equal(p.has(PermissionFlags.ViewChannel), true);
        assert.equal(p.has(PermissionFlags.BanMembers), false);
    });

    it("should remove permissions", () => {
        const p = new Permissions(PermissionFlags.SendMessages | PermissionFlags.ViewChannel)
            .remove(PermissionFlags.SendMessages);

        assert.equal(p.has(PermissionFlags.SendMessages), false);
        assert.equal(p.has(PermissionFlags.ViewChannel), true);
    });

    it("should check any", () => {
        const p = new Permissions(PermissionFlags.SendMessages);
        assert.equal(p.any(PermissionFlags.SendMessages, PermissionFlags.BanMembers), true);
        assert.equal(p.any(PermissionFlags.BanMembers, PermissionFlags.KickMembers), false);
    });

    it("should convert to array of names", () => {
        const p = new Permissions(PermissionFlags.SendMessages | PermissionFlags.ViewChannel);
        const arr = p.toArray();
        assert.ok(arr.includes("SendMessages"));
        assert.ok(arr.includes("ViewChannel"));
        assert.ok(!arr.includes("BanMembers"));
    });

    it("toString should return string representation", () => {
        const p = new Permissions(2048n);
        assert.equal(p.toString(), "2048");
    });

    it("static resolve should combine flags", () => {
        const bits = Permissions.resolve(PermissionFlags.SendMessages, PermissionFlags.ViewChannel);
        assert.equal(bits, PermissionFlags.SendMessages | PermissionFlags.ViewChannel);
    });

    it("static fromRole should create from permission string", () => {
        const p = Permissions.fromRole("2048");
        assert.equal(p.has(PermissionFlags.SendMessages), true);
    });

    it("add and remove should return new instances", () => {
        const original = new Permissions(0n);
        const added = original.add(PermissionFlags.SendMessages);
        assert.notEqual(original, added);
        assert.equal(original.has(PermissionFlags.SendMessages), false);
        assert.equal(added.has(PermissionFlags.SendMessages), true);
    });

    it("serialize should return all flags as boolean record", () => {
        const p = new Permissions(PermissionFlags.SendMessages | PermissionFlags.ViewChannel);
        const s = p.serialize();
        assert.equal(s.SendMessages, true);
        assert.equal(s.ViewChannel, true);
        assert.equal(s.BanMembers, false);
        assert.equal(typeof s.Administrator, "boolean");
    });

    it("serialize with Administrator should return all true", () => {
        const p = new Permissions(PermissionFlags.Administrator);
        const s = p.serialize();
        assert.equal(s.BanMembers, true);
        assert.equal(s.ManageGuild, true);
    });

    it("equals should return true for same bitfield", () => {
        const a = new Permissions(PermissionFlags.SendMessages);
        const b = new Permissions(PermissionFlags.SendMessages);
        assert.ok(a.equals(b));
    });

    it("equals should return false for different bitfield", () => {
        const a = new Permissions(PermissionFlags.SendMessages);
        const b = new Permissions(PermissionFlags.BanMembers);
        assert.ok(!a.equals(b));
    });

    it("equals should accept raw bigint", () => {
        const a = new Permissions(PermissionFlags.SendMessages);
        assert.ok(a.equals(PermissionFlags.SendMessages));
    });

    it("missing should return names of missing flags", () => {
        const p = new Permissions(PermissionFlags.SendMessages);
        const m = p.missing(PermissionFlags.SendMessages, PermissionFlags.BanMembers, PermissionFlags.KickMembers);
        assert.ok(!m.includes("SendMessages"));
        assert.ok(m.includes("BanMembers"));
        assert.ok(m.includes("KickMembers"));
    });

    it("missing should return empty array when all present", () => {
        const p = new Permissions(PermissionFlags.SendMessages | PermissionFlags.ViewChannel);
        assert.deepEqual(p.missing(PermissionFlags.SendMessages, PermissionFlags.ViewChannel), []);
    });
});
