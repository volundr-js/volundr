import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ComponentType, ButtonStyle, TextInputStyle } from "@volundr/types";
import {
    ActionRowBuilder,
    ButtonBuilder,
    StringSelectBuilder,
    TextInputBuilder,
    UserSelectBuilder,
    RoleSelectBuilder,
    MentionableSelectBuilder,
    ChannelSelectBuilder,
} from "../src/builders/ComponentBuilder.js";
import { ModalBuilder } from "../src/builders/ModalBuilder.js";

describe("ButtonBuilder", () => {
    it("should build a primary button", () => {
        const button = new ButtonBuilder()
            .setCustomId("btn_1")
            .setLabel("Click me")
            .setStyle(ButtonStyle.Primary)
            .toJSON();

        assert.equal(button.type, ComponentType.Button);
        assert.equal(button.custom_id, "btn_1");
        assert.equal(button.label, "Click me");
        assert.equal(button.style, ButtonStyle.Primary);
    });

    it("should build a link button", () => {
        const button = new ButtonBuilder()
            .setLabel("Visit")
            .setStyle(ButtonStyle.Link)
            .setURL("https://example.com")
            .toJSON();

        assert.equal(button.style, ButtonStyle.Link);
        assert.equal(button.url, "https://example.com");
    });

    it("should set disabled", () => {
        const button = new ButtonBuilder()
            .setCustomId("btn")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled()
            .toJSON();

        assert.equal(button.disabled, true);
    });
});

describe("ActionRowBuilder", () => {
    it("should add builder components", () => {
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder().setCustomId("a").setStyle(ButtonStyle.Primary).setLabel("A"),
                new ButtonBuilder().setCustomId("b").setStyle(ButtonStyle.Secondary).setLabel("B"),
            )
            .toJSON();

        assert.equal(row.type, ComponentType.ActionRow);
        assert.equal(row.components.length, 2);
    });

    it("should accept raw component objects", () => {
        const row = new ActionRowBuilder()
            .addComponents({
                type: ComponentType.Button,
                style: ButtonStyle.Primary,
                custom_id: "raw",
                label: "Raw",
            })
            .toJSON();

        assert.equal(row.components.length, 1);
        assert.equal((row.components[0] as any).custom_id, "raw");
    });
});

describe("StringSelectBuilder", () => {
    it("should build a string select menu", () => {
        const select = new StringSelectBuilder()
            .setCustomId("select_1")
            .setPlaceholder("Choose...")
            .setMinValues(1)
            .setMaxValues(3)
            .addOptions(
                { label: "Option A", value: "a" },
                { label: "Option B", value: "b", description: "Desc" },
            )
            .toJSON();

        assert.equal(select.type, ComponentType.StringSelect);
        assert.equal(select.custom_id, "select_1");
        assert.equal(select.placeholder, "Choose...");
        assert.equal(select.options.length, 2);
    });
});

describe("TextInputBuilder", () => {
    it("should build a text input", () => {
        const input = new TextInputBuilder()
            .setCustomId("input_1")
            .setLabel("Name")
            .setStyle(TextInputStyle.Short)
            .setPlaceholder("Enter name")
            .setMinLength(1)
            .setMaxLength(100)
            .setRequired()
            .toJSON();

        assert.equal(input.type, ComponentType.TextInput);
        assert.equal(input.custom_id, "input_1");
        assert.equal(input.style, TextInputStyle.Short);
        assert.equal(input.required, true);
    });
});

describe("Auto-type select builders", () => {
    it("UserSelectBuilder sets correct type", () => {
        const s = new UserSelectBuilder().setCustomId("u").toJSON();
        assert.equal(s.type, ComponentType.UserSelect);
    });

    it("RoleSelectBuilder sets correct type", () => {
        const s = new RoleSelectBuilder().setCustomId("r").toJSON();
        assert.equal(s.type, ComponentType.RoleSelect);
    });

    it("MentionableSelectBuilder sets correct type", () => {
        const s = new MentionableSelectBuilder().setCustomId("m").toJSON();
        assert.equal(s.type, ComponentType.MentionableSelect);
    });

    it("ChannelSelectBuilder sets correct type", () => {
        const s = new ChannelSelectBuilder().setCustomId("c").setChannelTypes(0, 2).toJSON();
        assert.equal(s.type, ComponentType.ChannelSelect);
        assert.deepEqual(s.channel_types, [0, 2]);
    });
});

describe("ModalBuilder", () => {
    it("should build a modal", () => {
        const row = new ActionRowBuilder().addComponents(
            new TextInputBuilder()
                .setCustomId("name")
                .setLabel("Name")
                .setStyle(TextInputStyle.Short),
        );

        const modal = new ModalBuilder()
            .setCustomId("modal_1")
            .setTitle("Form")
            .addComponents(row)
            .toJSON();

        assert.equal(modal.custom_id, "modal_1");
        assert.equal(modal.title, "Form");
        assert.equal(modal.components.length, 1);
        assert.equal(modal.components[0].type, ComponentType.ActionRow);
    });
});
