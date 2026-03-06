/**
 * Builder for file attachments in messages.
 * Wraps raw file data with metadata for the REST client.
 */
export class AttachmentBuilder {
    /** The file data (Buffer, Blob, or stream). */
    readonly data: Buffer | Blob;
    /** The file name (including extension). */
    name: string;
    /** Optional description (used as alt text for images). */
    description?: string;

    constructor(data: Buffer | Blob, options?: { name?: string; description?: string }) {
        this.data = data;
        this.name = options?.name ?? "file.dat";
        this.description = options?.description;
    }

    /** Set the file name. */
    setName(name: string): this {
        this.name = name;
        return this;
    }

    /** Set the description (alt text). */
    setDescription(description: string): this {
        this.description = description;
        return this;
    }

    /** Mark as spoiler by prepending SPOILER_ to the filename. */
    setSpoiler(spoiler = true): this {
        if (spoiler && !this.name.startsWith("SPOILER_")) {
            this.name = `SPOILER_${this.name}`;
        } else if (!spoiler && this.name.startsWith("SPOILER_")) {
            this.name = this.name.slice(8);
        }
        return this;
    }

    /** Convert to the format expected by the REST client. */
    toJSON(): { name: string; data: Buffer | Blob; description?: string } {
        return {
            name: this.name,
            data: this.data,
            description: this.description,
        };
    }
}
