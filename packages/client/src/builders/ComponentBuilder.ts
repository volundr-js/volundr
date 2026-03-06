import type {
    APIActionRow,
    APIButton,
    APIStringSelect,
    APISelectOption,
    APIUserSelect,
    APIRoleSelect,
    APIMentionableSelect,
    APIChannelSelect,
    APITextInput,
    APIComponent,
    APIEmoji,
    APITextDisplay,
    APIThumbnail,
    APISection,
    APIMediaGallery,
    APIMediaGalleryItem,
    APISeparator,
    APIContainer,
    APITopLevelComponent,
} from "@volundr/types";
import { ComponentType, ButtonStyle, TextInputStyle, SeparatorSpacing } from "@volundr/types";

type RowComponent = Exclude<APIComponent, APIActionRow>;

export class ActionRowBuilder {
    private components: RowComponent[] = [];

    addComponents(...components: (RowComponent | { toJSON(): RowComponent })[]): this {
        for (const c of components) {
            this.components.push("toJSON" in c ? c.toJSON() : c);
        }
        return this;
    }

    toJSON(): APIActionRow {
        return { type: ComponentType.ActionRow, components: this.components as APIComponent[] };
    }
}

export class ButtonBuilder {
    private data: Partial<APIButton> = { type: ComponentType.Button };

    setCustomId(id: string): this {
        if (id.length > 100) throw new RangeError(`Button custom_id exceeds 100 characters (got ${id.length})`);
        this.data.custom_id = id;
        return this;
    }

    setLabel(label: string): this {
        if (label.length > 80) throw new RangeError(`Button label exceeds 80 characters (got ${label.length})`);
        this.data.label = label;
        return this;
    }

    setStyle(style: ButtonStyle): this {
        this.data.style = style;
        return this;
    }

    setEmoji(emoji: Pick<APIEmoji, "id" | "name" | "animated">): this {
        this.data.emoji = emoji;
        return this;
    }

    setURL(url: string): this {
        this.data.url = url;
        return this;
    }

    setDisabled(disabled = true): this {
        this.data.disabled = disabled;
        return this;
    }

    toJSON(): APIButton {
        return { ...this.data } as APIButton;
    }
}

export class StringSelectBuilder {
    private data: Partial<APIStringSelect> & { options: APISelectOption[] } = {
        type: ComponentType.StringSelect,
        options: [],
    };

    setCustomId(id: string): this {
        if (id.length > 100) throw new RangeError(`Select custom_id exceeds 100 characters (got ${id.length})`);
        this.data.custom_id = id;
        return this;
    }

    setPlaceholder(placeholder: string): this {
        if (placeholder.length > 150) throw new RangeError(`Select placeholder exceeds 150 characters (got ${placeholder.length})`);
        this.data.placeholder = placeholder;
        return this;
    }

    setMinValues(min: number): this {
        this.data.min_values = min;
        return this;
    }

    setMaxValues(max: number): this {
        this.data.max_values = max;
        return this;
    }

    addOptions(...options: APISelectOption[]): this {
        this.data.options.push(...options);
        if (this.data.options.length > 25) {
            throw new RangeError(`StringSelect cannot have more than 25 options (got ${this.data.options.length})`);
        }
        return this;
    }

    setDisabled(disabled = true): this {
        this.data.disabled = disabled;
        return this;
    }

    toJSON(): APIStringSelect {
        return { ...this.data } as APIStringSelect;
    }
}

export class UserSelectBuilder {
    private data: Partial<APIUserSelect> = { type: ComponentType.UserSelect };

    setCustomId(id: string): this { this.data.custom_id = id; return this; }
    setPlaceholder(p: string): this { this.data.placeholder = p; return this; }
    setMinValues(n: number): this { this.data.min_values = n; return this; }
    setMaxValues(n: number): this { this.data.max_values = n; return this; }
    setDisabled(d = true): this { this.data.disabled = d; return this; }
    toJSON(): APIUserSelect { return { ...this.data } as APIUserSelect; }
}

export class RoleSelectBuilder {
    private data: Partial<APIRoleSelect> = { type: ComponentType.RoleSelect };

    setCustomId(id: string): this { this.data.custom_id = id; return this; }
    setPlaceholder(p: string): this { this.data.placeholder = p; return this; }
    setMinValues(n: number): this { this.data.min_values = n; return this; }
    setMaxValues(n: number): this { this.data.max_values = n; return this; }
    setDisabled(d = true): this { this.data.disabled = d; return this; }
    toJSON(): APIRoleSelect { return { ...this.data } as APIRoleSelect; }
}

export class MentionableSelectBuilder {
    private data: Partial<APIMentionableSelect> = { type: ComponentType.MentionableSelect };

    setCustomId(id: string): this { this.data.custom_id = id; return this; }
    setPlaceholder(p: string): this { this.data.placeholder = p; return this; }
    setMinValues(n: number): this { this.data.min_values = n; return this; }
    setMaxValues(n: number): this { this.data.max_values = n; return this; }
    setDisabled(d = true): this { this.data.disabled = d; return this; }
    toJSON(): APIMentionableSelect { return { ...this.data } as APIMentionableSelect; }
}

export class ChannelSelectBuilder {
    private data: Partial<APIChannelSelect> = { type: ComponentType.ChannelSelect };

    setCustomId(id: string): this { this.data.custom_id = id; return this; }
    setPlaceholder(p: string): this { this.data.placeholder = p; return this; }
    setMinValues(n: number): this { this.data.min_values = n; return this; }
    setMaxValues(n: number): this { this.data.max_values = n; return this; }
    setChannelTypes(...types: number[]): this { this.data.channel_types = types; return this; }
    setDisabled(d = true): this { this.data.disabled = d; return this; }
    toJSON(): APIChannelSelect { return { ...this.data } as APIChannelSelect; }
}

export class TextInputBuilder {
    private data: Partial<APITextInput> = { type: ComponentType.TextInput };

    setCustomId(id: string): this {
        this.data.custom_id = id;
        return this;
    }

    setLabel(label: string): this {
        this.data.label = label;
        return this;
    }

    setStyle(style: TextInputStyle): this {
        this.data.style = style;
        return this;
    }

    setPlaceholder(placeholder: string): this {
        this.data.placeholder = placeholder;
        return this;
    }

    setMinLength(min: number): this {
        if (min < 0 || min > 4000) throw new RangeError(`TextInput min_length must be between 0 and 4000 (got ${min})`);
        this.data.min_length = min;
        return this;
    }

    setMaxLength(max: number): this {
        if (max < 1 || max > 4000) throw new RangeError(`TextInput max_length must be between 1 and 4000 (got ${max})`);
        this.data.max_length = max;
        return this;
    }

    setRequired(required = true): this {
        this.data.required = required;
        return this;
    }

    setValue(value: string): this {
        this.data.value = value;
        return this;
    }

    toJSON(): APITextInput {
        return { ...this.data } as APITextInput;
    }
}

// --- Components V2 Builders ---

export class TextDisplayBuilder {
    private content = "";

    setContent(content: string): this {
        this.content = content;
        return this;
    }

    toJSON(): APITextDisplay {
        return { type: ComponentType.TextDisplay, content: this.content };
    }
}

export class ThumbnailBuilder {
    private url = "";
    private description?: string;
    private spoiler?: boolean;

    setURL(url: string): this { this.url = url; return this; }
    setDescription(desc: string): this { this.description = desc; return this; }
    setSpoiler(spoiler = true): this { this.spoiler = spoiler; return this; }

    toJSON(): APIThumbnail {
        const result: APIThumbnail = { type: ComponentType.Thumbnail, media: { url: this.url } };
        if (this.description !== undefined) result.description = this.description;
        if (this.spoiler !== undefined) result.spoiler = this.spoiler;
        return result;
    }
}

export class SectionBuilder {
    private components: APITextDisplay[] = [];
    private accessory?: APIThumbnail | APIButton;

    addTextDisplay(content: string): this {
        this.components.push({ type: ComponentType.TextDisplay, content });
        return this;
    }

    setThumbnailAccessory(thumbnail: ThumbnailBuilder | APIThumbnail): this {
        this.accessory = "toJSON" in thumbnail ? thumbnail.toJSON() : thumbnail;
        return this;
    }

    setButtonAccessory(button: ButtonBuilder | APIButton): this {
        this.accessory = "toJSON" in button ? button.toJSON() : button;
        return this;
    }

    toJSON(): APISection {
        if (!this.accessory) {
            throw new Error("SectionBuilder requires an accessory (Thumbnail or Button)");
        }
        return { type: ComponentType.Section, components: this.components, accessory: this.accessory };
    }
}

export class MediaGalleryBuilder {
    private items: APIMediaGalleryItem[] = [];

    addItem(url: string, description?: string, spoiler?: boolean): this {
        const item: APIMediaGalleryItem = { media: { url } };
        if (description !== undefined) item.description = description;
        if (spoiler !== undefined) item.spoiler = spoiler;
        this.items.push(item);
        return this;
    }

    toJSON(): APIMediaGallery {
        return { type: ComponentType.MediaGallery, items: this.items };
    }
}

export class SeparatorBuilder {
    private divider?: boolean;
    private spacing?: SeparatorSpacing;

    setDivider(divider = true): this { this.divider = divider; return this; }
    setSpacing(spacing: SeparatorSpacing): this { this.spacing = spacing; return this; }

    toJSON(): APISeparator {
        const result: APISeparator = { type: ComponentType.Separator };
        if (this.divider !== undefined) result.divider = this.divider;
        if (this.spacing !== undefined) result.spacing = this.spacing;
        return result;
    }
}

type V2Component = APITopLevelComponent | { toJSON(): APITopLevelComponent };

export class ContainerBuilder {
    private components: APITopLevelComponent[] = [];
    private accentColor?: number;
    private spoiler?: boolean;

    addComponents(...components: V2Component[]): this {
        for (const c of components) {
            this.components.push("toJSON" in c ? c.toJSON() : c);
        }
        return this;
    }

    addTextDisplay(content: string): this {
        this.components.push({ type: ComponentType.TextDisplay, content });
        return this;
    }

    addSeparator(divider = true, spacing?: SeparatorSpacing): this {
        const sep: APISeparator = { type: ComponentType.Separator, divider };
        if (spacing !== undefined) sep.spacing = spacing;
        this.components.push(sep);
        return this;
    }

    setAccentColor(color: number): this { this.accentColor = color; return this; }
    setSpoiler(spoiler = true): this { this.spoiler = spoiler; return this; }

    toJSON(): APIContainer {
        const result: APIContainer = { type: ComponentType.Container, components: this.components };
        if (this.accentColor !== undefined) result.accent_color = this.accentColor;
        if (this.spoiler !== undefined) result.spoiler = this.spoiler;
        return result;
    }
}
