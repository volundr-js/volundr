import type {
    APIEmbed, APIEmbedField, APIEmbedFooter, APIEmbedAuthor, APIEmbedMedia,
    APIActionRow, APIButton, APISelectOption,
} from "@volundr/types";
import { ComponentType, ButtonStyle } from "@volundr/types";

// ── Embed helpers ──────────────────────────────────────────────

export interface EmbedData {
    title?: string;
    description?: string;
    color?: number;
    url?: string;
    timestamp?: string | Date;
    footer?: string | APIEmbedFooter;
    author?: string | APIEmbedAuthor;
    image?: string | APIEmbedMedia;
    thumbnail?: string | APIEmbedMedia;
    fields?: APIEmbedField[];
}

/** Create an embed from a plain object. */
export function embed(data: EmbedData): APIEmbed {
    return {
        title: data.title,
        description: data.description,
        color: data.color,
        url: data.url,
        timestamp: data.timestamp instanceof Date
            ? data.timestamp.toISOString()
            : data.timestamp,
        footer: typeof data.footer === "string" ? { text: data.footer } : data.footer,
        author: typeof data.author === "string" ? { name: data.author } : data.author,
        image: typeof data.image === "string" ? { url: data.image } : data.image,
        thumbnail: typeof data.thumbnail === "string" ? { url: data.thumbnail } : data.thumbnail,
        fields: data.fields,
    };
}

/** Create an embed field. */
export function field(name: string, value: string, inline?: boolean): APIEmbedField {
    return { name, value, inline };
}

// ── Component helpers ──────────────────────────────────────────

/** Create an action row containing the given components. */
export function row(...components: (Record<string, unknown> | object)[]): APIActionRow {
    return {
        type: ComponentType.ActionRow,
        components: components as unknown as APIActionRow["components"],
    };
}

/** Create a button component. */
export function button(customId: string, label: string, style: ButtonStyle = ButtonStyle.Primary): APIButton {
    return {
        type: ComponentType.Button,
        style,
        label,
        custom_id: customId,
    };
}

/** Create a link button component. */
export function linkButton(url: string, label: string): APIButton {
    return {
        type: ComponentType.Button,
        style: ButtonStyle.Link,
        label,
        url,
    };
}

/** Create a string select option. */
export function option(label: string, value: string, description?: string): APISelectOption {
    return { label, value, description };
}
