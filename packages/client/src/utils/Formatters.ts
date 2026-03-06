import type { Snowflake } from "@volundr/types";

export type TimestampStyle = "t" | "T" | "d" | "D" | "f" | "F" | "R";

export const Formatters = {
    // --- Mentions ---

    /** Format a user mention. */
    userMention(userId: Snowflake): string {
        return `<@${userId}>`;
    },

    /** Format a channel mention. */
    channelMention(channelId: Snowflake): string {
        return `<#${channelId}>`;
    },

    /** Format a role mention. */
    roleMention(roleId: Snowflake): string {
        return `<@&${roleId}>`;
    },

    // --- Markdown ---

    /** Wrap text in bold. */
    bold(text: string): string {
        return `**${text}**`;
    },

    /** Wrap text in italic. */
    italic(text: string): string {
        return `*${text}*`;
    },

    /** Wrap text in underline. */
    underline(text: string): string {
        return `__${text}__`;
    },

    /** Wrap text in strikethrough. */
    strikethrough(text: string): string {
        return `~~${text}~~`;
    },

    /** Wrap text in spoiler tags. */
    spoiler(text: string): string {
        return `||${text}||`;
    },

    /** Wrap text in inline code. */
    inlineCode(text: string): string {
        return `\`${text}\``;
    },

    /** Wrap text in a code block. */
    codeBlock(language: string, text: string): string {
        return `\`\`\`${language}\n${text}\n\`\`\``;
    },

    /** Create a hyperlink. */
    hyperlink(text: string, url: string): string {
        return `[${text}](${url})`;
    },

    /** Format a single-line block quote. */
    quote(text: string): string {
        return `> ${text}`;
    },

    /** Format a multi-line block quote. */
    blockQuote(text: string): string {
        return `>>> ${text}`;
    },

    // --- Timestamps ---

    /** Format a Discord timestamp. */
    time(date: Date | number, style?: TimestampStyle): string {
        const seconds = Math.floor((date instanceof Date ? date.getTime() : date) / 1000);
        return style ? `<t:${seconds}:${style}>` : `<t:${seconds}>`;
    },

    // --- Emojis ---

    /** Format a custom emoji. */
    formatEmoji(emojiId: Snowflake, animated = false): string {
        return animated ? `<a:_:${emojiId}>` : `<:_:${emojiId}>`;
    },

    /** Format a slash command mention. */
    chatInputApplicationCommandMention(name: string, subcommandOrGroup?: string, subcommand?: string, commandId?: Snowflake): string {
        const fullName = subcommand
            ? `${name} ${subcommandOrGroup} ${subcommand}`
            : subcommandOrGroup
                ? `${name} ${subcommandOrGroup}`
                : name;
        return commandId ? `</${fullName}:${commandId}>` : `</${fullName}>`;
    },

    /** Wrap a URL in angle brackets to suppress the embed preview. */
    hideLinkEmbed(url: string): string {
        return `<${url}>`;
    },

    /** Create a masked/named hyperlink with optional title. */
    maskedLink(text: string, url: string, title?: string): string {
        return title ? `[${text}](${url} "${title}")` : `[${text}](${url})`;
    },

    /** Create a header (H1/H2/H3). */
    heading(text: string, level: 1 | 2 | 3 = 1): string {
        return `${"#".repeat(level)} ${text}`;
    },

    /** Create an unordered list from items. */
    unorderedList(items: string[]): string {
        return items.map(i => `- ${i}`).join("\n");
    },

    /** Create an ordered list from items. */
    orderedList(items: string[]): string {
        return items.map((i, idx) => `${idx + 1}. ${i}`).join("\n");
    },

    // --- Escape Functions ---

    /** Escape all markdown in a string. */
    escapeMarkdown(text: string): string {
        return text.replace(/[*_~`|\\>]/g, "\\$&");
    },

    /** Escape bold markers (**). */
    escapeBold(text: string): string {
        return text.replace(/\*\*/g, "\\*\\*");
    },

    /** Escape italic markers (single *). */
    escapeItalic(text: string): string {
        return text.replace(/(?<!\*)\*(?!\*)/g, "\\*");
    },

    /** Escape code block markers (```). */
    escapeCodeBlock(text: string): string {
        return text.replace(/```/g, "\\`\\`\\`");
    },

    /** Escape inline code markers (`). */
    escapeInlineCode(text: string): string {
        return text.replace(/`/g, "\\`");
    },

    /** Escape underline markers (__). */
    escapeUnderline(text: string): string {
        return text.replace(/__/g, "\\_\\_");
    },

    /** Escape spoiler markers (||). */
    escapeSpoiler(text: string): string {
        return text.replace(/\|\|/g, "\\|\\|");
    },

    /** Escape strikethrough markers (~~). */
    escapeStrikethrough(text: string): string {
        return text.replace(/~~/g, "\\~\\~");
    },
} as const;

/**
 * Tagged template that auto-formats Discord entities into mentions.
 *
 * Supported interpolation values:
 * - `User` → `<@id>`
 * - `GuildMember` → `<@id>`
 * - `BaseChannel` / any channel → `<#id>`
 * - `Role` → `<@&id>`
 * - `GuildEmoji` → `<:name:id>` / `<a:name:id>`
 * - `Date` → `<t:unix>`
 * - Everything else → `String(value)`
 *
 * @example
 * ```ts
 * import { fmt } from "@volundr/client";
 * await channel.send(fmt`Welcome ${member}! Check out ${rulesChannel}.`);
 * ```
 */
export function fmt(strings: TemplateStringsArray, ...values: unknown[]): string {
    let result = strings[0]!;
    for (let i = 0; i < values.length; i++) {
        result += resolveValue(values[i]) + strings[i + 1]!;
    }
    return result;
}

function resolveValue(val: unknown): string {
    if (val == null) return "";
    if (val instanceof Date) return `<t:${Math.floor(val.getTime() / 1000)}>`;
    if (typeof val !== "object") return String(val);

    const obj = val as Record<string, unknown>;

    // GuildEmoji - has `id` and `name` and `animated`
    if ("animated" in obj && "name" in obj && "id" in obj) {
        return obj.animated ? `<a:${obj.name}:${obj.id}>` : `<:${obj.name}:${obj.id}>`;
    }

    // Role - has `id` and object is a Role (check for guild-specific property)
    if ("hoist" in obj && "id" in obj) {
        return `<@&${obj.id}>`;
    }

    // Channel-like - has `id` and channel-like shape
    if ("type" in obj && "id" in obj && !("token" in obj)) {
        return `<#${obj.id}>`;
    }

    // User or GuildMember - has `id` and user-like shape
    if ("id" in obj && ("username" in obj || "user" in obj || "displayName" in obj)) {
        return `<@${obj.id}>`;
    }

    // Generic entity with toString
    if ("toString" in obj && typeof obj.toString === "function" && obj.toString !== Object.prototype.toString) {
        return obj.toString() as string;
    }

    return String(val);
}
