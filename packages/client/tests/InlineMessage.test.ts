import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
    InlineMessage, InlineEmbed, resolveMessageInput,
    embed, field, row, button, linkButton, option,
} from "../src/builders/index.js";
import { ButtonStyle, ComponentType } from "@volundr/types";

// ── InlineEmbed ───────────────────────────────────────────────

describe("InlineEmbed", () => {
    it("should set title and description directly", () => {
        const e = new InlineEmbed();
        e.title = "Hello";
        e.description = "World";
        const json = e.toJSON();
        assert.equal(json.title, "Hello");
        assert.equal(json.description, "World");
    });

    it("should set color as a number", () => {
        const e = new InlineEmbed();
        e.color = 0xff0000;
        assert.equal(e.toJSON().color, 0xff0000);
    });

    it("should add fields via method", () => {
        const e = new InlineEmbed();
        e.field("Name", "Value", true);
        e.field("Name2", "Value2");
        const json = e.toJSON();
        assert.equal(json.fields?.length, 2);
        assert.equal(json.fields![0]!.name, "Name");
        assert.equal(json.fields![0]!.inline, true);
        assert.equal(json.fields![1]!.inline, undefined);
    });

    it("should set footer", () => {
        const e = new InlineEmbed();
        e.footer("Footer text", "https://example.com/icon.png");
        const json = e.toJSON();
        assert.equal(json.footer?.text, "Footer text");
        assert.equal(json.footer?.icon_url, "https://example.com/icon.png");
    });

    it("should set author", () => {
        const e = new InlineEmbed();
        e.author("Author", "https://example.com/avatar.png", "https://example.com");
        const json = e.toJSON();
        assert.equal(json.author?.name, "Author");
        assert.equal(json.author?.icon_url, "https://example.com/avatar.png");
        assert.equal(json.author?.url, "https://example.com");
    });

    it("should set image and thumbnail", () => {
        const e = new InlineEmbed();
        e.image("https://example.com/image.png");
        e.thumbnail("https://example.com/thumb.png");
        const json = e.toJSON();
        assert.equal(json.image?.url, "https://example.com/image.png");
        assert.equal(json.thumbnail?.url, "https://example.com/thumb.png");
    });

    it("should omit fields when empty", () => {
        const e = new InlineEmbed();
        e.title = "Only title";
        const json = e.toJSON();
        assert.equal(json.fields, undefined);
        assert.equal(json.footer, undefined);
    });

    it("should be chainable", () => {
        const e = new InlineEmbed();
        const result = e.field("a", "b").footer("f").author("a").image("i").thumbnail("t");
        assert.equal(result, e);
    });
});

// ── InlineMessage ─────────────────────────────────────────────

describe("InlineMessage", () => {
    it("should set content directly", () => {
        const msg = new InlineMessage();
        msg.content = "Hello";
        const opts = msg.toOptions();
        assert.equal(opts.content, "Hello");
    });

    it("should add embeds via callback", () => {
        const msg = new InlineMessage();
        msg.embed((e) => {
            e.title = "Test";
            e.description = "Description";
            e.color = 0x00ff00;
        });
        const opts = msg.toOptions();
        assert.equal(opts.embeds?.length, 1);
        assert.equal(opts.embeds![0]!.title, "Test");
        assert.equal(opts.embeds![0]!.color, 0x00ff00);
    });

    it("should add multiple embeds", () => {
        const msg = new InlineMessage();
        msg.embed((e) => { e.title = "First"; });
        msg.embed((e) => { e.title = "Second"; });
        assert.equal(msg.toOptions().embeds?.length, 2);
    });

    it("should add pre-built embeds via addEmbed", () => {
        const msg = new InlineMessage();
        msg.addEmbed({ title: "Pre-built" });
        assert.equal(msg.toOptions().embeds![0]!.title, "Pre-built");
    });

    it("should add embeds from builder via addEmbed (toJSON)", () => {
        const e = new InlineEmbed();
        e.title = "From builder";
        const msg = new InlineMessage();
        msg.addEmbed(e);
        assert.equal(msg.toOptions().embeds![0]!.title, "From builder");
    });

    it("should add component rows", () => {
        const msg = new InlineMessage();
        msg.row({ type: 2, style: 1, label: "Click", custom_id: "btn1" });
        const opts = msg.toOptions();
        assert.equal(opts.components?.length, 1);
        assert.equal((opts.components![0] as Record<string, unknown>).type, ComponentType.ActionRow);
    });

    it("should add file attachments", () => {
        const msg = new InlineMessage();
        msg.file({ name: "test.txt", data: Buffer.from("hello") });
        const opts = msg.toOptions();
        assert.equal(opts.files?.length, 1);
        assert.equal(opts.files![0]!.name, "test.txt");
    });

    it("should set tts and flags", () => {
        const msg = new InlineMessage();
        msg.tts = true;
        msg.flags = 64;
        const opts = msg.toOptions();
        assert.equal(opts.tts, true);
        assert.equal(opts.flags, 64);
    });

    it("should omit empty arrays", () => {
        const msg = new InlineMessage();
        msg.content = "Just text";
        const opts = msg.toOptions();
        assert.equal(opts.embeds, undefined);
        assert.equal(opts.components, undefined);
    });

    it("should be chainable", () => {
        const msg = new InlineMessage();
        const result = msg.embed(() => {}).row().file({ name: "f", data: Buffer.from("") });
        assert.equal(result, msg);
    });
});

// ── resolveMessageInput ───────────────────────────────────────

describe("resolveMessageInput", () => {
    it("should resolve a string to content", () => {
        const opts = resolveMessageInput("Hello");
        assert.deepEqual(opts, { content: "Hello" });
    });

    it("should resolve a function via InlineMessage", () => {
        const opts = resolveMessageInput((msg) => {
            msg.content = "From callback";
            msg.embed((e) => {
                e.title = "Embed";
            });
        });
        assert.equal(opts.content, "From callback");
        assert.equal(opts.embeds?.length, 1);
        assert.equal(opts.embeds![0]!.title, "Embed");
    });

    it("should pass through a plain object", () => {
        const input = { content: "Direct", embeds: [{ title: "E" }] };
        const opts = resolveMessageInput(input);
        assert.equal(opts, input); // same reference
    });
});

// ── Functional helpers ────────────────────────────────────────

describe("embed helper", () => {
    it("should create an embed from data", () => {
        const e = embed({
            title: "Title",
            description: "Desc",
            color: 0xff0000,
        });
        assert.equal(e.title, "Title");
        assert.equal(e.description, "Desc");
        assert.equal(e.color, 0xff0000);
    });

    it("should wrap string footer to object", () => {
        const e = embed({ footer: "Footer text" });
        assert.deepEqual(e.footer, { text: "Footer text" });
    });

    it("should pass through object footer", () => {
        const e = embed({ footer: { text: "Footer", icon_url: "https://x.com/i.png" } });
        assert.equal(e.footer?.text, "Footer");
        assert.equal(e.footer?.icon_url, "https://x.com/i.png");
    });

    it("should wrap string author to object", () => {
        const e = embed({ author: "Author Name" });
        assert.deepEqual(e.author, { name: "Author Name" });
    });

    it("should wrap string image to object", () => {
        const e = embed({ image: "https://example.com/img.png" });
        assert.deepEqual(e.image, { url: "https://example.com/img.png" });
    });

    it("should wrap string thumbnail to object", () => {
        const e = embed({ thumbnail: "https://example.com/thumb.png" });
        assert.deepEqual(e.thumbnail, { url: "https://example.com/thumb.png" });
    });

    it("should convert Date timestamp to ISO string", () => {
        const date = new Date("2024-01-01T00:00:00.000Z");
        const e = embed({ timestamp: date });
        assert.equal(e.timestamp, "2024-01-01T00:00:00.000Z");
    });

    it("should pass through string timestamp", () => {
        const e = embed({ timestamp: "2024-01-01T00:00:00.000Z" });
        assert.equal(e.timestamp, "2024-01-01T00:00:00.000Z");
    });

    it("should include fields", () => {
        const e = embed({ fields: [{ name: "F", value: "V", inline: true }] });
        assert.equal(e.fields?.length, 1);
        assert.equal(e.fields![0]!.name, "F");
    });
});

describe("field helper", () => {
    it("should create an embed field", () => {
        const f = field("Name", "Value", true);
        assert.deepEqual(f, { name: "Name", value: "Value", inline: true });
    });

    it("should default inline to undefined", () => {
        const f = field("N", "V");
        assert.equal(f.inline, undefined);
    });
});

describe("row helper", () => {
    it("should create an action row", () => {
        const r = row({ type: 2, label: "btn" });
        assert.equal(r.type, ComponentType.ActionRow);
        assert.equal(r.components.length, 1);
    });

    it("should accept multiple components", () => {
        const r = row({ type: 2 }, { type: 2 }, { type: 2 });
        assert.equal(r.components.length, 3);
    });
});

describe("button helper", () => {
    it("should create a primary button by default", () => {
        const b = button("my_btn", "Click me");
        assert.equal(b.type, ComponentType.Button);
        assert.equal(b.style, ButtonStyle.Primary);
        assert.equal(b.label, "Click me");
        assert.equal(b.custom_id, "my_btn");
    });

    it("should accept a custom style", () => {
        const b = button("btn", "Danger", ButtonStyle.Danger);
        assert.equal(b.style, ButtonStyle.Danger);
    });
});

describe("linkButton helper", () => {
    it("should create a link button", () => {
        const b = linkButton("https://example.com", "Visit");
        assert.equal(b.type, ComponentType.Button);
        assert.equal(b.style, ButtonStyle.Link);
        assert.equal(b.url, "https://example.com");
        assert.equal(b.label, "Visit");
    });
});

describe("option helper", () => {
    it("should create a select option", () => {
        const o = option("Label", "value", "A description");
        assert.equal(o.label, "Label");
        assert.equal(o.value, "value");
        assert.equal(o.description, "A description");
    });

    it("should allow no description", () => {
        const o = option("L", "v");
        assert.equal(o.description, undefined);
    });
});
