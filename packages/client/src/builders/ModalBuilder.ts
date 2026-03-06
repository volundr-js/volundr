import type { APIModal, APIActionRow } from "@volundr/types";
import type { ActionRowBuilder } from "./ComponentBuilder.js";

export class ModalBuilder {
    private custom_id = "";
    private title = "";
    private components: APIActionRow[] = [];

    setCustomId(id: string): this {
        this.custom_id = id;
        return this;
    }

    setTitle(title: string): this {
        if (title.length > 45) throw new RangeError(`Modal title exceeds 45 characters (got ${title.length})`);
        this.title = title;
        return this;
    }

    addComponents(...rows: (APIActionRow | ActionRowBuilder)[]): this {
        for (const row of rows) {
            this.components.push("toJSON" in row ? row.toJSON() : row);
        }
        if (this.components.length > 5) {
            throw new RangeError(`Modal cannot have more than 5 action rows (got ${this.components.length})`);
        }
        return this;
    }

    toJSON(): APIModal {
        return {
            custom_id: this.custom_id,
            title: this.title,
            components: this.components,
        };
    }
}
