import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { PermissionFlags } from "../src/permissions/Permissions.js";
import { Collection } from "../src/collection/Collection.js";

// Minimal mock client for entity tests
function mockClient(): any {
    return {
        guilds: new Map(),
        channels: new Map(),
        users: new Map(),
        rest: { get: async () => ({}), post: async () => ({}), patch: async () => ({}), delete: async () => ({}) },
    };
}

describe("Message entity", () => {
    // We import dynamically to avoid full Client initialization
    it("should parse mentions from raw data", async () => {
        const { Message } = await import("../src/entities/Message.js");
        const client = mockClient();
        const raw = {
            id: "1",
            channel_id: "2",
            author: { id: "3", username: "test", discriminator: "0", global_name: null, avatar: null },
            content: "hello <@100>",
            timestamp: new Date().toISOString(),
            edited_timestamp: null,
            tts: false,
            mention_everyone: false,
            mentions: [
                { id: "100", username: "mentioned", discriminator: "0", global_name: "Mentioned", avatar: null },
            ],
            mention_roles: [],
            attachments: [],
            embeds: [],
            pinned: false,
            type: 0,
        };

        const msg = new Message(client, raw as any);
        assert.equal(msg.mentions.length, 1);
        assert.equal(msg.mentions[0].id, "100");
        assert.equal(msg.mentions[0].username, "mentioned");

        // toJSON should include mentions
        const json = msg.toJSON();
        assert.equal(json.mentions.length, 1);
        assert.equal(json.mentions[0].id, "100");
    });

    it("should default mentions to empty array", async () => {
        const { Message } = await import("../src/entities/Message.js");
        const client = mockClient();
        const raw = {
            id: "1",
            channel_id: "2",
            author: { id: "3", username: "test", discriminator: "0", global_name: null, avatar: null },
            content: "hello",
            timestamp: new Date().toISOString(),
            edited_timestamp: null,
            tts: false,
            mention_everyone: false,
            mention_roles: [],
            attachments: [],
            embeds: [],
            pinned: false,
            type: 0,
        };

        const msg = new Message(client, raw as any);
        assert.ok(Array.isArray(msg.mentions));
        assert.equal(msg.mentions.length, 0);
    });
});

describe("GuildMember.getPermissionsIn", () => {
    it("should apply channel permission overwrites", async () => {
        const { GuildMember } = await import("../src/entities/GuildMember.js");
        const { Permissions } = await import("../src/permissions/Permissions.js");

        const guildId = "guild1";
        const memberId = "user1";

        // Create a guild mock with roles
        const everyoneRole = {
            id: guildId,
            permissions: new Permissions(PermissionFlags.ViewChannel | PermissionFlags.SendMessages),
            position: 0,
        };

        const roles = new Collection<string, any>();
        roles.set(guildId, everyoneRole);

        const guild = {
            id: guildId,
            ownerId: "owner1",
            roles,
            members: new Map(),
        };

        const client = mockClient();
        client.guilds.set(guildId, guild);

        const member = new GuildMember(client, {
            user: { id: memberId, username: "test", discriminator: "0", global_name: null, avatar: null },
            roles: [],
            joined_at: new Date().toISOString(),
            deaf: false,
            mute: false,
            flags: 0,
        } as any, guildId, memberId);

        // Channel that denies SendMessages for @everyone
        const channel = {
            permissionOverwrites: [
                { id: guildId, type: 0, allow: "0", deny: String(PermissionFlags.SendMessages) },
            ],
        };

        const perms = member.getPermissionsIn(channel);
        assert.ok(perms.has(PermissionFlags.ViewChannel), "Should still have ViewChannel");
        assert.ok(!perms.has(PermissionFlags.SendMessages), "Should NOT have SendMessages (denied by overwrite)");
    });

    it("should allow member-specific overwrite to override role deny", async () => {
        const { GuildMember } = await import("../src/entities/GuildMember.js");
        const { Permissions } = await import("../src/permissions/Permissions.js");

        const guildId = "guild1";
        const memberId = "user1";

        const everyoneRole = {
            id: guildId,
            permissions: new Permissions(PermissionFlags.ViewChannel | PermissionFlags.SendMessages),
            position: 0,
        };

        const roles = new Collection<string, any>();
        roles.set(guildId, everyoneRole);

        const guild = {
            id: guildId,
            ownerId: "owner1",
            roles,
            members: new Map(),
        };

        const client = mockClient();
        client.guilds.set(guildId, guild);

        const member = new GuildMember(client, {
            user: { id: memberId, username: "test", discriminator: "0", global_name: null, avatar: null },
            roles: [],
            joined_at: new Date().toISOString(),
            deaf: false,
            mute: false,
            flags: 0,
        } as any, guildId, memberId);

        // Deny SendMessages for @everyone, but allow for this specific member
        const channel = {
            permissionOverwrites: [
                { id: guildId, type: 0, allow: "0", deny: String(PermissionFlags.SendMessages) },
                { id: memberId, type: 1, allow: String(PermissionFlags.SendMessages), deny: "0" },
            ],
        };

        const perms = member.getPermissionsIn(channel);
        assert.ok(perms.has(PermissionFlags.SendMessages), "Member overwrite should re-allow SendMessages");
    });

    it("should give owner all permissions regardless of overwrites", async () => {
        const { GuildMember } = await import("../src/entities/GuildMember.js");
        const { Permissions } = await import("../src/permissions/Permissions.js");

        const guildId = "guild1";
        const ownerId = "owner1";

        const everyoneRole = {
            id: guildId,
            permissions: new Permissions(0n),
            position: 0,
        };

        const roles = new Collection<string, any>();
        roles.set(guildId, everyoneRole);

        const guild = {
            id: guildId,
            ownerId,
            roles,
            members: new Map(),
        };

        const client = mockClient();
        client.guilds.set(guildId, guild);

        const member = new GuildMember(client, {
            user: { id: ownerId, username: "owner", discriminator: "0", global_name: null, avatar: null },
            roles: [],
            joined_at: new Date().toISOString(),
            deaf: false,
            mute: false,
            flags: 0,
        } as any, guildId, ownerId);

        const channel = {
            permissionOverwrites: [
                { id: guildId, type: 0, allow: "0", deny: String(PermissionFlags.SendMessages) },
            ],
        };

        const perms = member.getPermissionsIn(channel);
        assert.ok(perms.has(PermissionFlags.SendMessages), "Owner should have all permissions");
        assert.ok(perms.has(PermissionFlags.Administrator), "Owner should have Administrator");
    });
});

describe("ForumChannel properties", () => {
    it("should parse forum-specific fields", async () => {
        const { ForumChannel } = await import("../src/entities/channels/ForumChannel.js");
        const client = mockClient();
        const data = {
            id: "1",
            type: 15, // GuildForum
            name: "test-forum",
            guild_id: "guild1",
            available_tags: [
                { id: "tag1", name: "Bug", moderated: false, emoji_id: null, emoji_name: "🐛" },
                { id: "tag2", name: "Feature", moderated: true, emoji_id: "123", emoji_name: null },
            ],
            default_reaction_emoji: { emoji_id: null, emoji_name: "👍" },
            default_sort_order: 1,
            default_forum_layout: 2,
        };

        const forum = new ForumChannel(client, data as any);
        assert.equal(forum.availableTags.length, 2);
        assert.equal(forum.availableTags[0].name, "Bug");
        assert.equal(forum.availableTags[1].moderated, true);
        assert.deepEqual(forum.defaultReactionEmoji, { emoji_id: null, emoji_name: "👍" });
        assert.equal(forum.defaultSortOrder, 1);
        assert.equal(forum.defaultForumLayout, 2);
    });

    it("should default forum fields to empty/null", async () => {
        const { ForumChannel } = await import("../src/entities/channels/ForumChannel.js");
        const client = mockClient();
        const data = {
            id: "1",
            type: 15,
            name: "test-forum",
            guild_id: "guild1",
        };

        const forum = new ForumChannel(client, data as any);
        assert.deepEqual(forum.availableTags, []);
        assert.equal(forum.defaultReactionEmoji, null);
        assert.equal(forum.defaultSortOrder, null);
        assert.equal(forum.defaultForumLayout, 0);
    });
});
