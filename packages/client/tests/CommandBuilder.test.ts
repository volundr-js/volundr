import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
    SlashCommandBuilder,
    SlashCommandSubcommandBuilder,
    SlashCommandSubcommandGroupBuilder,
    SlashCommandOptionBuilder,
    ContextMenuCommandBuilder,
} from "../src/builders/index.js";
import { ApplicationCommandType, ApplicationCommandOptionType } from "@volundr/types";

describe("SlashCommandBuilder", () => {
    it("should build a minimal command", () => {
        const cmd = new SlashCommandBuilder()
            .setName("ping")
            .setDescription("Replies with pong!");
        const json = cmd.toJSON();
        assert.equal(json.name, "ping");
        assert.equal(json.description, "Replies with pong!");
        assert.equal(json.type, ApplicationCommandType.ChatInput);
    });

    it("should reject name with uppercase", () => {
        assert.throws(() => {
            new SlashCommandBuilder().setName("Ping");
        }, /lowercase/);
    });

    it("should reject name with spaces", () => {
        assert.throws(() => {
            new SlashCommandBuilder().setName("my command");
        }, /lowercase/);
    });

    it("should reject empty name", () => {
        assert.throws(() => {
            new SlashCommandBuilder().setName("");
        }, /1 and 32/);
    });

    it("should reject name > 32 chars", () => {
        assert.throws(() => {
            new SlashCommandBuilder().setName("a".repeat(33));
        }, /32/);
    });

    it("should accept name with hyphens and underscores", () => {
        const cmd = new SlashCommandBuilder().setName("my-cool_cmd");
        assert.equal(cmd.toJSON().name, "my-cool_cmd");
    });

    it("should reject empty description", () => {
        assert.throws(() => {
            new SlashCommandBuilder().setDescription("");
        }, /1 and 100/);
    });

    it("should reject description > 100 chars", () => {
        assert.throws(() => {
            new SlashCommandBuilder().setDescription("x".repeat(101));
        }, /100/);
    });

    it("should set permissions", () => {
        const cmd = new SlashCommandBuilder()
            .setName("ban")
            .setDescription("Ban a user")
            .setDefaultMemberPermissions(BigInt(1 << 2));
        assert.equal(cmd.toJSON().default_member_permissions, "4");
    });

    it("should set null permissions", () => {
        const cmd = new SlashCommandBuilder()
            .setName("test")
            .setDescription("Test")
            .setDefaultMemberPermissions(null);
        assert.equal(cmd.toJSON().default_member_permissions, null);
    });

    it("should set DM permission", () => {
        const cmd = new SlashCommandBuilder()
            .setName("test")
            .setDescription("Test")
            .setDMPermission(false);
        assert.equal(cmd.toJSON().dm_permission, false);
    });

    it("should set NSFW", () => {
        const cmd = new SlashCommandBuilder()
            .setName("test")
            .setDescription("Test")
            .setNSFW();
        assert.equal(cmd.toJSON().nsfw, true);
    });

    it("should set localizations", () => {
        const cmd = new SlashCommandBuilder()
            .setName("test")
            .setDescription("Test")
            .setNameLocalizations({ "pt-BR": "teste" })
            .setDescriptionLocalizations({ "pt-BR": "Teste" });
        const json = cmd.toJSON();
        assert.deepEqual(json.name_localizations, { "pt-BR": "teste" });
        assert.deepEqual(json.description_localizations, { "pt-BR": "Teste" });
    });

    // --- Options ---

    it("should add a string option via callback", () => {
        const cmd = new SlashCommandBuilder()
            .setName("echo")
            .setDescription("Echo text")
            .addStringOption((opt) =>
                opt.setName("text").setDescription("The text").setRequired(true),
            );
        const json = cmd.toJSON();
        assert.equal(json.options?.length, 1);
        assert.equal(json.options![0]!.type, ApplicationCommandOptionType.String);
        assert.equal(json.options![0]!.name, "text");
        assert.equal(json.options![0]!.required, true);
    });

    it("should add all 9 option types", () => {
        const cmd = new SlashCommandBuilder()
            .setName("test")
            .setDescription("Test")
            .addStringOption((o) => o.setName("s").setDescription("d"))
            .addIntegerOption((o) => o.setName("i").setDescription("d"))
            .addBooleanOption((o) => o.setName("b").setDescription("d"))
            .addUserOption((o) => o.setName("u").setDescription("d"))
            .addChannelOption((o) => o.setName("c").setDescription("d"))
            .addRoleOption((o) => o.setName("r").setDescription("d"))
            .addMentionableOption((o) => o.setName("m").setDescription("d"))
            .addNumberOption((o) => o.setName("n").setDescription("d"))
            .addAttachmentOption((o) => o.setName("a").setDescription("d"));
        const types = cmd.toJSON().options!.map((o) => o.type);
        assert.deepEqual(types, [3, 4, 5, 6, 7, 8, 9, 10, 11]);
    });

    it("should reject > 25 options", () => {
        const cmd = new SlashCommandBuilder().setName("test").setDescription("Test");
        for (let i = 0; i < 25; i++) {
            cmd.addStringOption((o) => o.setName(`opt${i}`).setDescription("d"));
        }
        assert.throws(() => {
            cmd.addStringOption((o) => o.setName("opt25").setDescription("d"));
        }, /25/);
    });

    // --- Subcommands ---

    it("should add a subcommand", () => {
        const cmd = new SlashCommandBuilder()
            .setName("config")
            .setDescription("Config")
            .addSubcommand((sub) =>
                sub.setName("set").setDescription("Set a value")
                    .addStringOption((o) => o.setName("key").setDescription("The key")),
            );
        const json = cmd.toJSON();
        assert.equal(json.options?.length, 1);
        assert.equal(json.options![0]!.type, ApplicationCommandOptionType.SubCommand);
        assert.equal(json.options![0]!.name, "set");
        assert.equal(json.options![0]!.options?.length, 1);
    });

    it("should add a subcommand group with nested subcommands", () => {
        const cmd = new SlashCommandBuilder()
            .setName("admin")
            .setDescription("Admin commands")
            .addSubcommandGroup((group) =>
                group.setName("user").setDescription("User management")
                    .addSubcommand((sub) =>
                        sub.setName("ban").setDescription("Ban user"),
                    )
                    .addSubcommand((sub) =>
                        sub.setName("kick").setDescription("Kick user"),
                    ),
            );
        const json = cmd.toJSON();
        assert.equal(json.options?.length, 1);
        assert.equal(json.options![0]!.type, ApplicationCommandOptionType.SubCommandGroup);
        assert.equal(json.options![0]!.options?.length, 2);
    });

    it("should reject mixing subcommands with regular options", () => {
        const cmd = new SlashCommandBuilder()
            .setName("test")
            .setDescription("Test")
            .addSubcommand((sub) => sub.setName("sub").setDescription("Sub"));
        assert.throws(() => {
            cmd.addStringOption((o) => o.setName("opt").setDescription("d"));
        }, /subcommands/);
    });

    it("should reject mixing regular options with subcommands", () => {
        const cmd = new SlashCommandBuilder()
            .setName("test")
            .setDescription("Test")
            .addStringOption((o) => o.setName("opt").setDescription("d"));
        assert.throws(() => {
            cmd.addSubcommand((sub) => sub.setName("sub").setDescription("Sub"));
        }, /regular options/);
    });
});

describe("SlashCommandOptionBuilder", () => {
    it("should build with choices", () => {
        const cmd = new SlashCommandBuilder()
            .setName("color")
            .setDescription("Pick a color")
            .addStringOption((o) =>
                o.setName("color").setDescription("The color").addChoices(
                    { name: "Red", value: "red" },
                    { name: "Blue", value: "blue" },
                ),
            );
        const opt = cmd.toJSON().options![0]!;
        assert.equal(opt.choices?.length, 2);
        assert.equal(opt.choices![0]!.name, "Red");
        assert.equal(opt.choices![0]!.value, "red");
    });

    it("should reject > 25 choices", () => {
        assert.throws(() => {
            new SlashCommandBuilder()
                .setName("test")
                .setDescription("Test")
                .addStringOption((o) => {
                    o.setName("opt").setDescription("d");
                    const choices = Array.from({ length: 26 }, (_, i) => ({ name: `c${i}`, value: `v${i}` }));
                    return o.addChoices(...choices);
                });
        }, /25/);
    });

    it("should reject choice name > 100 chars", () => {
        assert.throws(() => {
            new SlashCommandBuilder()
                .setName("test")
                .setDescription("Test")
                .addStringOption((o) =>
                    o.setName("opt").setDescription("d").addChoices({ name: "x".repeat(101), value: "v" }),
                );
        }, /100/);
    });

    it("should reject choice string value > 100 chars", () => {
        assert.throws(() => {
            new SlashCommandBuilder()
                .setName("test")
                .setDescription("Test")
                .addStringOption((o) =>
                    o.setName("opt").setDescription("d").addChoices({ name: "c", value: "x".repeat(101) }),
                );
        }, /100/);
    });

    it("should set autocomplete", () => {
        const cmd = new SlashCommandBuilder()
            .setName("search")
            .setDescription("Search")
            .addStringOption((o) =>
                o.setName("query").setDescription("Search query").setAutocomplete(true),
            );
        assert.equal(cmd.toJSON().options![0]!.autocomplete, true);
    });

    it("should set min/max length for string options", () => {
        const cmd = new SlashCommandBuilder()
            .setName("test")
            .setDescription("Test")
            .addStringOption((o) =>
                o.setName("text").setDescription("Text").setMinLength(1).setMaxLength(100),
            );
        const opt = cmd.toJSON().options![0]!;
        assert.equal(opt.min_length, 1);
        assert.equal(opt.max_length, 100);
    });

    it("should reject min_length > 6000", () => {
        assert.throws(() => {
            new SlashCommandBuilder()
                .setName("test")
                .setDescription("Test")
                .addStringOption((o) => o.setName("t").setDescription("d").setMinLength(6001));
        }, /6000/);
    });

    it("should reject max_length > 6000", () => {
        assert.throws(() => {
            new SlashCommandBuilder()
                .setName("test")
                .setDescription("Test")
                .addStringOption((o) => o.setName("t").setDescription("d").setMaxLength(6001));
        }, /6000/);
    });

    it("should reject max_length < 1", () => {
        assert.throws(() => {
            new SlashCommandBuilder()
                .setName("test")
                .setDescription("Test")
                .addStringOption((o) => o.setName("t").setDescription("d").setMaxLength(0));
        }, /1 and 6000/);
    });

    it("should set min/max value for number options", () => {
        const cmd = new SlashCommandBuilder()
            .setName("test")
            .setDescription("Test")
            .addIntegerOption((o) =>
                o.setName("count").setDescription("Count").setMinValue(1).setMaxValue(100),
            );
        const opt = cmd.toJSON().options![0]!;
        assert.equal(opt.min_value, 1);
        assert.equal(opt.max_value, 100);
    });

    it("should add channel types", () => {
        const cmd = new SlashCommandBuilder()
            .setName("test")
            .setDescription("Test")
            .addChannelOption((o) =>
                o.setName("channel").setDescription("Channel").addChannelTypes(0, 2),
            );
        assert.deepEqual(cmd.toJSON().options![0]!.channel_types, [0, 2]);
    });
});

describe("SlashCommandSubcommandGroupBuilder", () => {
    it("should build with name and description", () => {
        const group = new SlashCommandSubcommandGroupBuilder()
            .setName("manage")
            .setDescription("Manage things")
            .addSubcommand((sub) => sub.setName("add").setDescription("Add"));
        const json = group.toJSON();
        assert.equal(json.type, ApplicationCommandOptionType.SubCommandGroup);
        assert.equal(json.name, "manage");
        assert.equal(json.options?.length, 1);
    });

    it("should reject > 25 subcommands", () => {
        const group = new SlashCommandSubcommandGroupBuilder()
            .setName("test")
            .setDescription("Test");
        for (let i = 0; i < 25; i++) {
            group.addSubcommand((sub) => sub.setName(`sub${i}`).setDescription("d"));
        }
        assert.throws(() => {
            group.addSubcommand((sub) => sub.setName("sub25").setDescription("d"));
        }, /25/);
    });
});

describe("ContextMenuCommandBuilder", () => {
    it("should build a User context menu", () => {
        const cmd = new ContextMenuCommandBuilder()
            .setName("Get User Info")
            .setType(ApplicationCommandType.User);
        const json = cmd.toJSON();
        assert.equal(json.name, "Get User Info");
        assert.equal(json.type, ApplicationCommandType.User);
        assert.equal(json.description, undefined);
        assert.equal(json.options, undefined);
    });

    it("should build a Message context menu", () => {
        const cmd = new ContextMenuCommandBuilder()
            .setName("Report Message")
            .setType(ApplicationCommandType.Message);
        assert.equal(cmd.toJSON().type, ApplicationCommandType.Message);
    });

    it("should allow uppercase and spaces in name", () => {
        const cmd = new ContextMenuCommandBuilder().setName("My Cool Command");
        assert.equal(cmd.toJSON().name, "My Cool Command");
    });

    it("should reject name > 32 chars", () => {
        assert.throws(() => {
            new ContextMenuCommandBuilder().setName("x".repeat(33));
        }, /32/);
    });

    it("should reject empty name", () => {
        assert.throws(() => {
            new ContextMenuCommandBuilder().setName("");
        }, /1 and 32/);
    });

    it("should set permissions and DM", () => {
        const cmd = new ContextMenuCommandBuilder()
            .setName("Admin Action")
            .setType(ApplicationCommandType.User)
            .setDefaultMemberPermissions(BigInt(8))
            .setDMPermission(false)
            .setNSFW(false);
        const json = cmd.toJSON();
        assert.equal(json.default_member_permissions, "8");
        assert.equal(json.dm_permission, false);
        assert.equal(json.nsfw, false);
    });

    it("should set localizations", () => {
        const cmd = new ContextMenuCommandBuilder()
            .setName("Report")
            .setType(ApplicationCommandType.Message)
            .setNameLocalizations({ "pt-BR": "Reportar" });
        assert.deepEqual(cmd.toJSON().name_localizations, { "pt-BR": "Reportar" });
    });
});
