import type { APIEmbed, APIEmbedField, APIEmbedFooter, APIEmbedAuthor, APIEmbedMedia } from "@volundr/types";

function validateLength(value: string, max: number, field: string): void {
    if (value.length > max) {
        throw new RangeError(`Embed ${field} exceeds maximum length of ${max} (got ${value.length})`);
    }
}

export class EmbedBuilder {
    private data: APIEmbed = {};

    setTitle(title: string): this {
        validateLength(title, 256, "title");
        this.data.title = title;
        return this;
    }

    setDescription(description: string): this {
        validateLength(description, 4096, "description");
        this.data.description = description;
        return this;
    }

    setColor(color: number): this {
        if (color < 0 || color > 0xffffff) {
            throw new RangeError(`Embed color must be between 0x000000 and 0xFFFFFF (got ${color})`);
        }
        this.data.color = color;
        return this;
    }

    setURL(url: string): this {
        this.data.url = url;
        return this;
    }

    setTimestamp(date: Date | string = new Date()): this {
        this.data.timestamp = date instanceof Date ? date.toISOString() : date;
        return this;
    }

    setFooter(footer: APIEmbedFooter): this {
        validateLength(footer.text, 2048, "footer text");
        this.data.footer = footer;
        return this;
    }

    setImage(url: string): this {
        this.data.image = { url };
        return this;
    }

    setThumbnail(url: string): this {
        this.data.thumbnail = { url };
        return this;
    }

    setAuthor(author: APIEmbedAuthor): this {
        validateLength(author.name, 256, "author name");
        this.data.author = author;
        return this;
    }

    addFields(...fields: APIEmbedField[]): this {
        if (!this.data.fields) this.data.fields = [];
        for (const field of fields) {
            validateLength(field.name, 256, "field name");
            validateLength(field.value, 1024, "field value");
        }
        this.data.fields.push(...fields);
        if (this.data.fields.length > 25) {
            throw new RangeError(`Embed cannot have more than 25 fields (got ${this.data.fields.length})`);
        }
        return this;
    }

    setFields(...fields: APIEmbedField[]): this {
        if (fields.length > 25) {
            throw new RangeError(`Embed cannot have more than 25 fields (got ${fields.length})`);
        }
        for (const field of fields) {
            validateLength(field.name, 256, "field name");
            validateLength(field.value, 1024, "field value");
        }
        this.data.fields = fields;
        return this;
    }

    toJSON(): APIEmbed {
        return structuredClone(this.data);
    }
}
