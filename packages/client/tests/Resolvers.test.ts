import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { resolveUserId, resolveChannelId, resolveGuildId, resolveRoleId, resolveEmojiId, resolveMessageId } from "../src/utils/Resolvers.js";

describe("Resolvers", () => {
    describe("resolveUserId", () => {
        it("should return a string snowflake as-is", () => {
            assert.equal(resolveUserId("123456789"), "123456789");
        });

        it("should extract id from an object with id", () => {
            assert.equal(resolveUserId({ id: "111" } as never), "111");
        });

        it("should extract user.id from a member-like object", () => {
            assert.equal(resolveUserId({ user: { id: "222" } } as never), "222");
        });

        it("should extract author.id from a message-like object", () => {
            assert.equal(resolveUserId({ author: { id: "333" } } as never), "333");
        });

        it("should throw for unresolvable input", () => {
            assert.throws(() => resolveUserId(42 as never), /Cannot resolve user ID/);
        });
    });

    describe("resolveChannelId", () => {
        it("should return a string snowflake as-is", () => {
            assert.equal(resolveChannelId("123456789"), "123456789");
        });

        it("should extract id from an object with id", () => {
            assert.equal(resolveChannelId({ id: "444" } as never), "444");
        });

        it("should throw for unresolvable input", () => {
            assert.throws(() => resolveChannelId(42 as never), /Cannot resolve channel ID/);
        });
    });

    describe("resolveGuildId", () => {
        it("should return a string snowflake as-is", () => {
            assert.equal(resolveGuildId("123456789"), "123456789");
        });

        it("should extract id from an object with id", () => {
            assert.equal(resolveGuildId({ id: "555" } as never), "555");
        });

        it("should throw for unresolvable input", () => {
            assert.throws(() => resolveGuildId(42 as never), /Cannot resolve guild ID/);
        });
    });

    describe("resolveRoleId", () => {
        it("should return a string snowflake as-is", () => {
            assert.equal(resolveRoleId("123456789"), "123456789");
        });

        it("should extract id from an object with id", () => {
            assert.equal(resolveRoleId({ id: "666" } as never), "666");
        });

        it("should throw for unresolvable input", () => {
            assert.throws(() => resolveRoleId(42 as never), /Cannot resolve role ID/);
        });
    });

    describe("resolveEmojiId", () => {
        it("should return string snowflake as-is", () => {
            assert.equal(resolveEmojiId("123456789"), "123456789");
        });

        it("should parse <:name:id> format", () => {
            assert.equal(resolveEmojiId("<:smile:123456789>"), "123456789");
        });

        it("should parse <a:name:id> animated format", () => {
            assert.equal(resolveEmojiId("<a:wave:987654321>"), "987654321");
        });

        it("should extract id from object with id", () => {
            assert.equal(resolveEmojiId({ id: "111" } as never), "111");
        });

        it("should throw for unresolvable input", () => {
            assert.throws(() => resolveEmojiId(42 as never), /Cannot resolve emoji ID/);
        });
    });

    describe("resolveMessageId", () => {
        it("should return string snowflake as-is", () => {
            assert.equal(resolveMessageId("123456789"), "123456789");
        });

        it("should extract id from object with id", () => {
            assert.equal(resolveMessageId({ id: "222" } as never), "222");
        });

        it("should throw for unresolvable input", () => {
            assert.throws(() => resolveMessageId(42 as never), /Cannot resolve message ID/);
        });
    });
});
