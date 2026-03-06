import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { EmbedBuilder } from "../src/builders/EmbedBuilder.js";

describe("EmbedBuilder", () => {
    it("should build a basic embed", () => {
        const embed = new EmbedBuilder()
            .setTitle("Test")
            .setDescription("Description")
            .setColor(0xFF0000)
            .toJSON();

        assert.equal(embed.title, "Test");
        assert.equal(embed.description, "Description");
        assert.equal(embed.color, 0xFF0000);
    });

    it("should set URL and timestamp", () => {
        const embed = new EmbedBuilder()
            .setURL("https://example.com")
            .setTimestamp("2024-01-01T00:00:00.000Z")
            .toJSON();

        assert.equal(embed.url, "https://example.com");
        assert.equal(embed.timestamp, "2024-01-01T00:00:00.000Z");
    });

    it("should set footer, image, thumbnail, and author", () => {
        const embed = new EmbedBuilder()
            .setFooter({ text: "Footer" })
            .setImage("https://img.com/a.png")
            .setThumbnail("https://img.com/b.png")
            .setAuthor({ name: "Author", url: "https://example.com" })
            .toJSON();

        assert.deepEqual(embed.footer, { text: "Footer" });
        assert.deepEqual(embed.image, { url: "https://img.com/a.png" });
        assert.deepEqual(embed.thumbnail, { url: "https://img.com/b.png" });
        assert.equal(embed.author?.name, "Author");
    });

    it("should add fields with addFields", () => {
        const embed = new EmbedBuilder()
            .addFields(
                { name: "Field 1", value: "Value 1" },
                { name: "Field 2", value: "Value 2", inline: true },
            )
            .toJSON();

        assert.equal(embed.fields?.length, 2);
        assert.equal(embed.fields![0].name, "Field 1");
        assert.equal(embed.fields![1].inline, true);
    });

    it("should replace fields with setFields", () => {
        const embed = new EmbedBuilder()
            .addFields({ name: "Old", value: "Old" })
            .setFields({ name: "New", value: "New" })
            .toJSON();

        assert.equal(embed.fields?.length, 1);
        assert.equal(embed.fields![0].name, "New");
    });

    it("should return a copy from toJSON", () => {
        const builder = new EmbedBuilder().setTitle("Test");
        const json1 = builder.toJSON();
        const json2 = builder.toJSON();
        assert.notEqual(json1, json2);
        assert.deepEqual(json1, json2);
    });
});
