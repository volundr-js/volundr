import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { InteractionType } from "@volundr/types";
import { interactionFrom } from "../src/entities/interactions/index.js";
import { ChatInputInteraction } from "../src/entities/interactions/ChatInputInteraction.js";
import { ContextMenuInteraction } from "../src/entities/interactions/ContextMenuInteraction.js";
import { ButtonInteraction } from "../src/entities/interactions/ButtonInteraction.js";
import { SelectMenuInteraction } from "../src/entities/interactions/SelectMenuInteraction.js";
import { ModalSubmitInteraction } from "../src/entities/interactions/ModalSubmitInteraction.js";
import { AutocompleteInteraction } from "../src/entities/interactions/AutocompleteInteraction.js";
import { BaseInteraction } from "../src/entities/interactions/BaseInteraction.js";

// Minimal mock client
const mockClient = {
    guilds: new Map(),
    channels: new Map(),
    users: new Map(),
    respondInteraction: async () => {},
    editInteractionResponse: async () => ({}),
    deleteInteractionResponse: async () => {},
    sendFollowup: async () => ({}),
} as never;

function makeInteraction(type: number, data?: Record<string, unknown>) {
    return {
        id: "123456789",
        application_id: "999",
        type,
        data,
        token: "test-token",
        version: 1,
        entitlements: [],
    } as never;
}

describe("interactionFrom", () => {
    it("should create ChatInputInteraction for slash commands", () => {
        const interaction = interactionFrom(mockClient, makeInteraction(
            InteractionType.ApplicationCommand,
            { type: 1, name: "test", id: "cmd1" },
        ));
        assert.ok(interaction instanceof ChatInputInteraction);
    });

    it("should create ContextMenuInteraction for user context menus (type 2)", () => {
        const interaction = interactionFrom(mockClient, makeInteraction(
            InteractionType.ApplicationCommand,
            { type: 2, name: "User Info", id: "cmd2" },
        ));
        assert.ok(interaction instanceof ContextMenuInteraction);
    });

    it("should create ContextMenuInteraction for message context menus (type 3)", () => {
        const interaction = interactionFrom(mockClient, makeInteraction(
            InteractionType.ApplicationCommand,
            { type: 3, name: "Report Message", id: "cmd3" },
        ));
        assert.ok(interaction instanceof ContextMenuInteraction);
    });

    it("should create ButtonInteraction for buttons (component_type 2)", () => {
        const interaction = interactionFrom(mockClient, makeInteraction(
            InteractionType.MessageComponent,
            { component_type: 2, custom_id: "btn1" },
        ));
        assert.ok(interaction instanceof ButtonInteraction);
    });

    it("should create SelectMenuInteraction for select menus", () => {
        const interaction = interactionFrom(mockClient, makeInteraction(
            InteractionType.MessageComponent,
            { component_type: 3, custom_id: "sel1", values: ["opt1"] },
        ));
        assert.ok(interaction instanceof SelectMenuInteraction);
    });

    it("should create ModalSubmitInteraction for modal submissions", () => {
        const interaction = interactionFrom(mockClient, makeInteraction(
            InteractionType.ModalSubmit,
            { custom_id: "modal1", components: [] },
        ));
        assert.ok(interaction instanceof ModalSubmitInteraction);
    });

    it("should create AutocompleteInteraction for autocomplete", () => {
        const interaction = interactionFrom(mockClient, makeInteraction(
            InteractionType.ApplicationCommandAutocomplete,
            { type: 1, name: "test", id: "cmd4", options: [] },
        ));
        assert.ok(interaction instanceof AutocompleteInteraction);
    });

    it("should create BaseInteraction for unknown types", () => {
        const interaction = interactionFrom(mockClient, makeInteraction(99));
        assert.ok(interaction instanceof BaseInteraction);
        assert.ok(!(interaction instanceof ChatInputInteraction));
    });
});

describe("BaseInteraction type guards", () => {
    it("isChatInputCommand should return true for slash commands", () => {
        const interaction = interactionFrom(mockClient, makeInteraction(
            InteractionType.ApplicationCommand,
            { type: 1, name: "test", id: "cmd1" },
        ));
        assert.ok(interaction.isChatInputCommand());
        assert.ok(!interaction.isContextMenuCommand());
        assert.ok(!interaction.isButton());
        assert.ok(!interaction.isSelectMenu());
        assert.ok(!interaction.isModalSubmit());
        assert.ok(!interaction.isAutocomplete());
    });

    it("isContextMenuCommand should return true for context menus", () => {
        const interaction = interactionFrom(mockClient, makeInteraction(
            InteractionType.ApplicationCommand,
            { type: 2, name: "User Info", id: "cmd2" },
        ));
        assert.ok(interaction.isContextMenuCommand());
        assert.ok(!interaction.isChatInputCommand());
    });

    it("isButton should return true for buttons", () => {
        const interaction = interactionFrom(mockClient, makeInteraction(
            InteractionType.MessageComponent,
            { component_type: 2, custom_id: "btn1" },
        ));
        assert.ok(interaction.isButton());
        assert.ok(!interaction.isSelectMenu());
    });

    it("isSelectMenu should return true for select menus", () => {
        const interaction = interactionFrom(mockClient, makeInteraction(
            InteractionType.MessageComponent,
            { component_type: 3, custom_id: "sel1", values: [] },
        ));
        assert.ok(interaction.isSelectMenu());
        assert.ok(!interaction.isButton());
    });

    it("isModalSubmit should return true for modals", () => {
        const interaction = interactionFrom(mockClient, makeInteraction(
            InteractionType.ModalSubmit,
            { custom_id: "modal1", components: [] },
        ));
        assert.ok(interaction.isModalSubmit());
    });

    it("isAutocomplete should return true for autocomplete", () => {
        const interaction = interactionFrom(mockClient, makeInteraction(
            InteractionType.ApplicationCommandAutocomplete,
            { type: 1, name: "test", id: "cmd4", options: [] },
        ));
        assert.ok(interaction.isAutocomplete());
    });

    it("inGuild should return true when guildId is set", () => {
        const raw = {
            ...makeInteraction(InteractionType.ApplicationCommand, { type: 1, name: "test", id: "cmd1" }),
            guild_id: "guild123",
        } as never;
        const interaction = interactionFrom(mockClient, raw);
        assert.ok(interaction.inGuild());
    });

    it("inGuild should return false when guildId is null", () => {
        const interaction = interactionFrom(mockClient, makeInteraction(
            InteractionType.ApplicationCommand,
            { type: 1, name: "test", id: "cmd1" },
        ));
        assert.ok(!interaction.inGuild());
    });
});

describe("ContextMenuInteraction", () => {
    it("should expose commandName", () => {
        const interaction = interactionFrom(mockClient, makeInteraction(
            InteractionType.ApplicationCommand,
            { type: 2, name: "Get User Info", id: "cmd2" },
        )) as ContextMenuInteraction;
        assert.equal(interaction.commandName, "Get User Info");
    });

    it("should expose commandId", () => {
        const interaction = interactionFrom(mockClient, makeInteraction(
            InteractionType.ApplicationCommand,
            { type: 2, name: "test", id: "cmd999" },
        )) as ContextMenuInteraction;
        assert.equal(interaction.commandId, "cmd999");
    });

    it("should expose commandType", () => {
        const userCtx = interactionFrom(mockClient, makeInteraction(
            InteractionType.ApplicationCommand,
            { type: 2, name: "test", id: "cmd1" },
        )) as ContextMenuInteraction;
        assert.equal(userCtx.commandType, 2);

        const msgCtx = interactionFrom(mockClient, makeInteraction(
            InteractionType.ApplicationCommand,
            { type: 3, name: "test", id: "cmd2" },
        )) as ContextMenuInteraction;
        assert.equal(msgCtx.commandType, 3);
    });

    it("isUserContextMenu should return true for type 2", () => {
        const interaction = interactionFrom(mockClient, makeInteraction(
            InteractionType.ApplicationCommand,
            { type: 2, name: "test", id: "cmd1" },
        )) as ContextMenuInteraction;
        assert.ok(interaction.isUserContextMenu());
        assert.ok(!interaction.isMessageContextMenu());
    });

    it("isMessageContextMenu should return true for type 3", () => {
        const interaction = interactionFrom(mockClient, makeInteraction(
            InteractionType.ApplicationCommand,
            { type: 3, name: "test", id: "cmd1" },
        )) as ContextMenuInteraction;
        assert.ok(interaction.isMessageContextMenu());
        assert.ok(!interaction.isUserContextMenu());
    });

    it("should expose targetId", () => {
        const interaction = interactionFrom(mockClient, makeInteraction(
            InteractionType.ApplicationCommand,
            { type: 2, name: "test", id: "cmd1", target_id: "target123" },
        )) as ContextMenuInteraction;
        assert.equal(interaction.targetId, "target123");
    });

    it("should return null for targetId when not present", () => {
        const interaction = interactionFrom(mockClient, makeInteraction(
            InteractionType.ApplicationCommand,
            { type: 2, name: "test", id: "cmd1" },
        )) as ContextMenuInteraction;
        assert.equal(interaction.targetId, null);
    });
});

describe("InteractionOptions subcommand traversal", () => {
    function makeSlash(options: unknown[]) {
        return interactionFrom(mockClient, {
            id: "1",
            application_id: "999",
            type: InteractionType.ApplicationCommand,
            data: { type: 1, name: "cmd", id: "c1", options },
            token: "tok",
            version: 1,
            entitlements: [],
        } as never) as ChatInputInteraction;
    }

    it("getSubcommand() returns name for flat subcommand", () => {
        const i = makeSlash([{ type: 1, name: "reset", options: [] }]);
        assert.equal(i.options.getSubcommand(), "reset");
    });

    it("getSubcommand() returns name inside subcommand group", () => {
        const i = makeSlash([
            { type: 2, name: "sources", options: [{ type: 1, name: "add", options: [] }] },
        ]);
        assert.equal(i.options.getSubcommand(), "add");
    });

    it("getSubcommand() returns null when no subcommand", () => {
        const i = makeSlash([{ type: 3, name: "query", value: "hello" }]);
        assert.equal(i.options.getSubcommand(), null);
    });

    it("getSubcommandGroup() returns group name", () => {
        const i = makeSlash([
            { type: 2, name: "sources", options: [{ type: 1, name: "add", options: [] }] },
        ]);
        assert.equal(i.options.getSubcommandGroup(), "sources");
    });

    it("getString() resolves option inside grouped subcommand", () => {
        const i = makeSlash([
            {
                type: 2, name: "sources", options: [{
                    type: 1, name: "add", options: [
                        { type: 3, name: "url", value: "https://example.com" },
                    ],
                }],
            },
        ]);
        assert.equal(i.options.getString("url"), "https://example.com");
    });

    it("getFocused() resolves focused option inside grouped subcommand", () => {
        const i = makeSlash([
            {
                type: 2, name: "sources", options: [{
                    type: 1, name: "add", options: [
                        { type: 3, name: "url", value: "htt", focused: true },
                    ],
                }],
            },
        ]);
        const focused = i.options.getFocused();
        assert.ok(focused !== null);
        assert.equal(focused.name, "url");
        assert.equal(focused.value, "htt");
    });
});

describe("InteractionOptions name collision (issue #2)", () => {
    function makeSlash(options: unknown[]) {
        return interactionFrom(mockClient, {
            id: "1",
            application_id: "999",
            type: InteractionType.ApplicationCommand,
            data: { type: 1, name: "config", id: "c1", options },
            token: "tok",
            version: 1,
            entitlements: [],
        } as never) as ChatInputInteraction;
    }

    it("getChannelId() returns value when subcommand and option share the same name", () => {
        // /config channel channel:#general
        const i = makeSlash([{
            type: 1,
            name: "channel",
            options: [{ type: 7, name: "channel", value: "123456789" }],
        }]);
        assert.equal(i.options.getChannelId("channel"), "123456789");
    });

    it("getString() returns value when subcommand and option share the same name", () => {
        // /config name name:hello
        const i = makeSlash([{
            type: 1,
            name: "name",
            options: [{ type: 3, name: "name", value: "hello" }],
        }]);
        assert.equal(i.options.getString("name"), "hello");
    });
});
