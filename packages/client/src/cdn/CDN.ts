import type { Snowflake } from "@volundr/types";

const BASE = "https://cdn.discordapp.com";

type ImageSize = 16 | 32 | 64 | 128 | 256 | 512 | 1024 | 2048 | 4096;
type ImageFormat = "webp" | "png" | "jpg" | "gif";

interface ImageOptions {
    size?: ImageSize;
    format?: ImageFormat;
}

function makeURL(path: string, hash: string, opts: ImageOptions = {}): string {
    const format = opts.format ?? (hash.startsWith("a_") ? "gif" : "webp");
    const url = `${BASE}${path}/${hash}.${format}`;
    return opts.size ? `${url}?size=${opts.size}` : url;
}

export class CDN {
    static avatar(userId: Snowflake, hash: string, opts?: ImageOptions): string {
        return makeURL(`/avatars/${userId}`, hash, opts);
    }

    static defaultAvatar(userId: Snowflake): string {
        const index = Number(BigInt(userId) >> 22n) % 6;
        return `${BASE}/embed/avatars/${index}.png`;
    }

    static guildIcon(guildId: Snowflake, hash: string, opts?: ImageOptions): string {
        return makeURL(`/icons/${guildId}`, hash, opts);
    }

    static guildBanner(guildId: Snowflake, hash: string, opts?: ImageOptions): string {
        return makeURL(`/banners/${guildId}`, hash, opts);
    }

    static guildSplash(guildId: Snowflake, hash: string, opts?: ImageOptions): string {
        return makeURL(`/splashes/${guildId}`, hash, opts);
    }

    static discoverySplash(guildId: Snowflake, hash: string, opts?: ImageOptions): string {
        return makeURL(`/discovery-splashes/${guildId}`, hash, opts);
    }

    static userBanner(userId: Snowflake, hash: string, opts?: ImageOptions): string {
        return makeURL(`/banners/${userId}`, hash, opts);
    }

    static emoji(emojiId: Snowflake, animated = false, opts?: Omit<ImageOptions, "format">): string {
        const format = animated ? "gif" : "webp";
        const url = `${BASE}/emojis/${emojiId}.${format}`;
        return opts?.size ? `${url}?size=${opts.size}` : url;
    }

    static memberAvatar(guildId: Snowflake, userId: Snowflake, hash: string, opts?: ImageOptions): string {
        return makeURL(`/guilds/${guildId}/users/${userId}/avatars`, hash, opts);
    }

    static roleIcon(roleId: Snowflake, hash: string, opts?: ImageOptions): string {
        return makeURL(`/role-icons/${roleId}`, hash, opts);
    }

    static sticker(stickerId: Snowflake, format: "png" | "apng" | "lottie" | "gif" = "png"): string {
        return `${BASE}/stickers/${stickerId}.${format}`;
    }

    static stickerPack(bannerAssetId: Snowflake): string {
        return `${BASE}/app-assets/710982414301790216/store/${bannerAssetId}.webp`;
    }

    static applicationIcon(applicationId: Snowflake, hash: string, opts?: ImageOptions): string {
        return makeURL(`/app-icons/${applicationId}`, hash, opts);
    }
}
