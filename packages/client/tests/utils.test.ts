import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { SnowflakeUtil, Formatters, Colors } from "../src/index.js";

describe("SnowflakeUtil", () => {
    // Discord's first snowflake-ish ID example
    const testSnowflake = "175928847299117063";

    it("should extract timestamp from snowflake", () => {
        const ts = SnowflakeUtil.timestampFrom(testSnowflake);
        assert.equal(typeof ts, "number");
        assert.ok(ts > 1420070400000); // After Discord epoch
        assert.ok(ts < Date.now());
    });

    it("should convert snowflake to Date", () => {
        const date = SnowflakeUtil.toDate(testSnowflake);
        assert.ok(date instanceof Date);
        assert.equal(date.getTime(), SnowflakeUtil.timestampFrom(testSnowflake));
    });

    it("should deconstruct snowflake", () => {
        const parts = SnowflakeUtil.deconstruct(testSnowflake);
        assert.equal(typeof parts.timestamp, "number");
        assert.equal(typeof parts.workerId, "number");
        assert.equal(typeof parts.processId, "number");
        assert.equal(typeof parts.increment, "number");
        assert.ok(parts.workerId >= 0 && parts.workerId <= 31);
        assert.ok(parts.processId >= 0 && parts.processId <= 31);
        assert.ok(parts.increment >= 0 && parts.increment <= 4095);
    });

    it("should generate snowflake from timestamp", () => {
        const now = Date.now();
        const snowflake = SnowflakeUtil.generate(now);
        const extracted = SnowflakeUtil.timestampFrom(snowflake);
        assert.equal(extracted, now);
    });

    it("should generate snowflake from Date", () => {
        const date = new Date("2023-01-01T00:00:00Z");
        const snowflake = SnowflakeUtil.generate(date);
        const extracted = SnowflakeUtil.toDate(snowflake);
        assert.equal(extracted.getTime(), date.getTime());
    });

    it("should round-trip correctly", () => {
        const ts = 1700000000000;
        const snowflake = SnowflakeUtil.generate(ts);
        assert.equal(SnowflakeUtil.timestampFrom(snowflake), ts);
    });

    it("should have DISCORD_EPOCH constant", () => {
        assert.equal(SnowflakeUtil.DISCORD_EPOCH, 1420070400000);
    });
});

describe("Formatters", () => {
    it("should format user mentions", () => {
        assert.equal(Formatters.userMention("123456"), "<@123456>");
    });

    it("should format channel mentions", () => {
        assert.equal(Formatters.channelMention("123456"), "<#123456>");
    });

    it("should format role mentions", () => {
        assert.equal(Formatters.roleMention("123456"), "<@&123456>");
    });

    it("should format bold text", () => {
        assert.equal(Formatters.bold("hello"), "**hello**");
    });

    it("should format italic text", () => {
        assert.equal(Formatters.italic("hello"), "*hello*");
    });

    it("should format underline text", () => {
        assert.equal(Formatters.underline("hello"), "__hello__");
    });

    it("should format strikethrough text", () => {
        assert.equal(Formatters.strikethrough("hello"), "~~hello~~");
    });

    it("should format spoiler text", () => {
        assert.equal(Formatters.spoiler("hello"), "||hello||");
    });

    it("should format inline code", () => {
        assert.equal(Formatters.inlineCode("hello"), "`hello`");
    });

    it("should format code blocks", () => {
        assert.equal(Formatters.codeBlock("js", "const x = 1"), "```js\nconst x = 1\n```");
    });

    it("should format hyperlinks", () => {
        assert.equal(Formatters.hyperlink("Google", "https://google.com"), "[Google](https://google.com)");
    });

    it("should format quotes", () => {
        assert.equal(Formatters.quote("hello"), "> hello");
    });

    it("should format block quotes", () => {
        assert.equal(Formatters.blockQuote("hello"), ">>> hello");
    });

    it("should format timestamps without style", () => {
        const result = Formatters.time(1700000000000);
        assert.equal(result, "<t:1700000000>");
    });

    it("should format timestamps with style", () => {
        assert.equal(Formatters.time(1700000000000, "R"), "<t:1700000000:R>");
        assert.equal(Formatters.time(1700000000000, "F"), "<t:1700000000:F>");
    });

    it("should format timestamps from Date", () => {
        const date = new Date(1700000000000);
        assert.equal(Formatters.time(date), "<t:1700000000>");
    });

    it("should format custom emojis", () => {
        assert.equal(Formatters.formatEmoji("123456"), "<:_:123456>");
        assert.equal(Formatters.formatEmoji("123456", true), "<a:_:123456>");
    });

    it("escapeMarkdown should escape all markdown characters", () => {
        assert.equal(Formatters.escapeMarkdown("**bold** _italic_ ~~strike~~ `code` ||spoiler||"),
            "\\*\\*bold\\*\\* \\_italic\\_ \\~\\~strike\\~\\~ \\`code\\` \\|\\|spoiler\\|\\|");
    });

    it("escapeMarkdown should not alter text without markdown", () => {
        assert.equal(Formatters.escapeMarkdown("hello world"), "hello world");
    });

    it("escapeBold should escape double asterisks", () => {
        assert.equal(Formatters.escapeBold("**bold**"), "\\*\\*bold\\*\\*");
    });

    it("escapeItalic should escape single asterisks but not double", () => {
        assert.equal(Formatters.escapeItalic("*italic*"), "\\*italic\\*");
        // Double asterisks should remain
        assert.equal(Formatters.escapeItalic("**bold**"), "**bold**");
    });

    it("escapeCodeBlock should escape triple backticks", () => {
        assert.equal(Formatters.escapeCodeBlock("```code```"), "\\`\\`\\`code\\`\\`\\`");
    });

    it("escapeInlineCode should escape single backticks", () => {
        assert.equal(Formatters.escapeInlineCode("`code`"), "\\`code\\`");
    });

    it("escapeUnderline should escape double underscores", () => {
        assert.equal(Formatters.escapeUnderline("__underline__"), "\\_\\_underline\\_\\_");
    });

    it("escapeSpoiler should escape double pipes", () => {
        assert.equal(Formatters.escapeSpoiler("||spoiler||"), "\\|\\|spoiler\\|\\|");
    });

    it("escapeStrikethrough should escape double tildes", () => {
        assert.equal(Formatters.escapeStrikethrough("~~strike~~"), "\\~\\~strike\\~\\~");
    });
});

describe("Colors", () => {
    it("should have standard color values", () => {
        assert.equal(Colors.Default, 0x000000);
        assert.equal(Colors.White, 0xffffff);
        assert.equal(Colors.Red, 0xed4245);
        assert.equal(Colors.Blurple, 0x5865f2);
        assert.equal(Colors.Green, 0x57f287);
    });

    it("should have all expected colors", () => {
        const keys = Object.keys(Colors);
        assert.ok(keys.length >= 25);
        assert.ok(keys.includes("Default"));
        assert.ok(keys.includes("Blurple"));
        assert.ok(keys.includes("Greyple"));
        assert.ok(keys.includes("Fuchsia"));
    });

    it("should have all values in valid range", () => {
        for (const [name, value] of Object.entries(Colors)) {
            assert.ok(value >= 0 && value <= 0xffffff, `Color ${name} = ${value} is out of range`);
        }
    });
});
