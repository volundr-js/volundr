import type {
    APIEmbed, APIEmbedField, APIEmbedFooter, APIEmbedAuthor, APIEmbedMedia,
    APIActionRow, APITopLevelComponent,
} from "@volundr/types";
import { ComponentType } from "@volundr/types";
import type { FileAttachment } from "@volundr/rest";
import type { CreateMessageOptions } from "../types.js";

// ── InlineEmbed ────────────────────────────────────────────────

export class InlineEmbed {
    title?: string;
    description?: string;
    color?: number;
    url?: string;
    timestamp?: string;

    private _footer?: APIEmbedFooter;
    private _author?: APIEmbedAuthor;
    private _image?: APIEmbedMedia;
    private _thumbnail?: APIEmbedMedia;
    private _fields: APIEmbedField[] = [];

    field(name: string, value: string, inline?: boolean): this {
        this._fields.push({ name, value, inline });
        return this;
    }

    footer(text: string, iconUrl?: string): this {
        this._footer = { text, icon_url: iconUrl };
        return this;
    }

    author(name: string, iconUrl?: string, url?: string): this {
        this._author = { name, icon_url: iconUrl, url };
        return this;
    }

    image(url: string): this {
        this._image = { url };
        return this;
    }

    thumbnail(url: string): this {
        this._thumbnail = { url };
        return this;
    }

    toJSON(): APIEmbed {
        return {
            title: this.title,
            description: this.description,
            color: this.color,
            url: this.url,
            timestamp: this.timestamp,
            footer: this._footer,
            author: this._author,
            image: this._image,
            thumbnail: this._thumbnail,
            fields: this._fields.length > 0 ? this._fields : undefined,
        };
    }
}

// ── Resolvable ─────────────────────────────────────────────────

interface HasToJSON<T> {
    toJSON(): T;
}

function resolve<T>(item: T | HasToJSON<T>): T {
    return typeof item === "object" && item !== null && "toJSON" in item
        ? (item as HasToJSON<T>).toJSON()
        : item as T;
}

// ── InlineMessage ──────────────────────────────────────────────

export class InlineMessage {
    content?: string;
    tts?: boolean;
    flags?: number;

    private _embeds: APIEmbed[] = [];
    private _components: (APIActionRow | APITopLevelComponent)[] = [];
    private _files?: FileAttachment[];

    /** Add an embed via callback DSL. */
    embed(fn: (e: InlineEmbed) => void): this {
        const e = new InlineEmbed();
        fn(e);
        this._embeds.push(e.toJSON());
        return this;
    }

    /** Add a pre-built embed (APIEmbed or builder with toJSON). */
    addEmbed(embed: APIEmbed | HasToJSON<APIEmbed>): this {
        this._embeds.push(resolve(embed));
        return this;
    }

    /** Add an action row with components. Accepts builders or raw API objects. */
    row(...components: (object | HasToJSON<unknown>)[]): this {
        const resolved = components.map((c) => resolve(c));
        this._components.push({
            type: ComponentType.ActionRow,
            components: resolved,
        } as APIActionRow);
        return this;
    }

    /** Add a pre-built component row. */
    addComponent(component: (APIActionRow | APITopLevelComponent) | HasToJSON<APIActionRow | APITopLevelComponent>): this {
        this._components.push(resolve(component));
        return this;
    }

    /** Add a file attachment. */
    file(attachment: FileAttachment): this {
        if (!this._files) this._files = [];
        this._files.push(attachment);
        return this;
    }

    /** @internal Convert to CreateMessageOptions. */
    toOptions(): CreateMessageOptions {
        return {
            content: this.content,
            tts: this.tts,
            flags: this.flags,
            embeds: this._embeds.length > 0 ? this._embeds : undefined,
            components: this._components.length > 0 ? this._components : undefined,
            files: this._files,
        };
    }
}

// ── Resolver ───────────────────────────────────────────────────

export type MessageInput = CreateMessageOptions | string | ((msg: InlineMessage) => void);

/**
 * Resolve various message input formats into CreateMessageOptions.
 * Accepts:
 * - A string (becomes { content })
 * - A callback (receives InlineMessage builder)
 * - A plain CreateMessageOptions object
 */
export function resolveMessageInput(input: MessageInput): CreateMessageOptions {
    if (typeof input === "string") return { content: input };
    if (typeof input === "function") {
        const msg = new InlineMessage();
        input(msg);
        return msg.toOptions();
    }
    return input;
}
