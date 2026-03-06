import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { CDN } from "../src/cdn/CDN.js";

const BASE = "https://cdn.discordapp.com";

describe("CDN", () => {
    it("should generate avatar URL", () => {
        const url = CDN.avatar("123456789", "abc123");
        assert.equal(url, `${BASE}/avatars/123456789/abc123.webp`);
    });

    it("should detect animated avatar", () => {
        const url = CDN.avatar("123456789", "a_abc123");
        assert.equal(url, `${BASE}/avatars/123456789/a_abc123.gif`);
    });

    it("should respect format override", () => {
        const url = CDN.avatar("123456789", "a_abc123", { format: "png" });
        assert.equal(url, `${BASE}/avatars/123456789/a_abc123.png`);
    });

    it("should append size param", () => {
        const url = CDN.avatar("123456789", "abc123", { size: 256 });
        assert.equal(url, `${BASE}/avatars/123456789/abc123.webp?size=256`);
    });

    it("should generate default avatar URL", () => {
        const url = CDN.defaultAvatar("123456789012345678");
        assert.ok(url.startsWith(`${BASE}/embed/avatars/`));
        assert.ok(url.endsWith(".png"));
    });

    it("should generate guild icon URL", () => {
        const url = CDN.guildIcon("111", "hash");
        assert.equal(url, `${BASE}/icons/111/hash.webp`);
    });

    it("should generate guild banner URL", () => {
        const url = CDN.guildBanner("111", "hash");
        assert.equal(url, `${BASE}/banners/111/hash.webp`);
    });

    it("should generate guild splash URL", () => {
        const url = CDN.guildSplash("111", "hash");
        assert.equal(url, `${BASE}/splashes/111/hash.webp`);
    });

    it("should generate discovery splash URL", () => {
        const url = CDN.discoverySplash("111", "hash");
        assert.equal(url, `${BASE}/discovery-splashes/111/hash.webp`);
    });

    it("should generate user banner URL", () => {
        const url = CDN.userBanner("111", "hash");
        assert.equal(url, `${BASE}/banners/111/hash.webp`);
    });

    it("should generate emoji URL", () => {
        const url = CDN.emoji("999");
        assert.equal(url, `${BASE}/emojis/999.webp`);
    });

    it("should generate animated emoji URL", () => {
        const url = CDN.emoji("999", true);
        assert.equal(url, `${BASE}/emojis/999.gif`);
    });

    it("should generate member avatar URL", () => {
        const url = CDN.memberAvatar("111", "222", "hash");
        assert.equal(url, `${BASE}/guilds/111/users/222/avatars/hash.webp`);
    });

    it("should generate role icon URL", () => {
        const url = CDN.roleIcon("111", "hash");
        assert.equal(url, `${BASE}/role-icons/111/hash.webp`);
    });

    it("should generate role icon URL with size", () => {
        const url = CDN.roleIcon("111", "hash", { size: 128 });
        assert.equal(url, `${BASE}/role-icons/111/hash.webp?size=128`);
    });

    it("should generate sticker URL", () => {
        const url = CDN.sticker("999");
        assert.equal(url, `${BASE}/stickers/999.png`);
    });

    it("should generate sticker URL with gif format", () => {
        const url = CDN.sticker("999", "gif");
        assert.equal(url, `${BASE}/stickers/999.gif`);
    });

    it("should generate sticker pack URL", () => {
        const url = CDN.stickerPack("888");
        assert.equal(url, `${BASE}/app-assets/710982414301790216/store/888.webp`);
    });

    it("should generate application icon URL", () => {
        const url = CDN.applicationIcon("777", "hash");
        assert.equal(url, `${BASE}/app-icons/777/hash.webp`);
    });
});
