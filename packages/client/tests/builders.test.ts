import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { EmbedBuilder, ButtonBuilder, StringSelectBuilder, ModalBuilder } from "../src/builders/index.js";
import { ButtonStyle } from "@volundr/types";

describe("EmbedBuilder validation", () => {
    it("should accept valid title", () => {
        const embed = new EmbedBuilder().setTitle("Hello");
        assert.equal(embed.toJSON().title, "Hello");
    });

    it("should reject title > 256 chars", () => {
        assert.throws(() => {
            new EmbedBuilder().setTitle("x".repeat(257));
        }, /256/);
    });

    it("should accept valid description", () => {
        const embed = new EmbedBuilder().setDescription("Hello world");
        assert.equal(embed.toJSON().description, "Hello world");
    });

    it("should reject description > 4096 chars", () => {
        assert.throws(() => {
            new EmbedBuilder().setDescription("x".repeat(4097));
        }, /4096/);
    });

    it("should accept valid color", () => {
        const embed = new EmbedBuilder().setColor(0xff0000);
        assert.equal(embed.toJSON().color, 0xff0000);
    });

    it("should reject negative color", () => {
        assert.throws(() => {
            new EmbedBuilder().setColor(-1);
        }, /0x000000/);
    });

    it("should reject color > 0xFFFFFF", () => {
        assert.throws(() => {
            new EmbedBuilder().setColor(0x1000000);
        }, /0xFFFFFF/);
    });

    it("should reject footer text > 2048 chars", () => {
        assert.throws(() => {
            new EmbedBuilder().setFooter({ text: "x".repeat(2049) });
        }, /2048/);
    });

    it("should reject author name > 256 chars", () => {
        assert.throws(() => {
            new EmbedBuilder().setAuthor({ name: "x".repeat(257) });
        }, /256/);
    });

    it("should reject > 25 fields", () => {
        const fields = Array.from({ length: 26 }, (_, i) => ({ name: `f${i}`, value: `v${i}` }));
        assert.throws(() => {
            new EmbedBuilder().addFields(...fields);
        }, /25/);
    });

    it("should reject field name > 256 chars", () => {
        assert.throws(() => {
            new EmbedBuilder().addFields({ name: "x".repeat(257), value: "ok" });
        }, /256/);
    });

    it("should reject field value > 1024 chars", () => {
        assert.throws(() => {
            new EmbedBuilder().addFields({ name: "ok", value: "x".repeat(1025) });
        }, /1024/);
    });

    it("should deep copy in toJSON", () => {
        const embed = new EmbedBuilder()
            .setTitle("test")
            .addFields({ name: "f1", value: "v1" });
        const json1 = embed.toJSON();
        const json2 = embed.toJSON();
        assert.notStrictEqual(json1, json2);
        assert.notStrictEqual(json1.fields, json2.fields);
    });
});

describe("ButtonBuilder validation", () => {
    it("should accept valid label", () => {
        const btn = new ButtonBuilder().setLabel("Click me").setStyle(ButtonStyle.Primary);
        assert.equal(btn.toJSON().label, "Click me");
    });

    it("should reject label > 80 chars", () => {
        assert.throws(() => {
            new ButtonBuilder().setLabel("x".repeat(81));
        }, /80/);
    });

    it("should reject custom_id > 100 chars", () => {
        assert.throws(() => {
            new ButtonBuilder().setCustomId("x".repeat(101));
        }, /100/);
    });
});

describe("StringSelectBuilder validation", () => {
    it("should reject custom_id > 100 chars", () => {
        assert.throws(() => {
            new StringSelectBuilder().setCustomId("x".repeat(101));
        }, /100/);
    });

    it("should reject placeholder > 150 chars", () => {
        assert.throws(() => {
            new StringSelectBuilder().setPlaceholder("x".repeat(151));
        }, /150/);
    });

    it("should reject > 25 options", () => {
        const select = new StringSelectBuilder();
        const options = Array.from({ length: 26 }, (_, i) => ({ label: `opt${i}`, value: `v${i}` }));
        assert.throws(() => {
            select.addOptions(...options);
        }, /25/);
    });
});

describe("ModalBuilder validation", () => {
    it("should reject title > 45 chars", () => {
        assert.throws(() => {
            new ModalBuilder().setTitle("x".repeat(46));
        }, /45/);
    });
});
