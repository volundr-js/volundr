import type { InteractionResponseType, APIInteractionCallbackData } from "@volundr/types";
import { BaseInteraction, type InteractionReplyOptions } from "./BaseInteraction.js";

export class SelectMenuInteraction extends BaseInteraction {
    /** The custom_id of the select menu. */
    get customId(): string {
        return this.data?.custom_id ?? "";
    }

    /** Check if the custom_id starts with a prefix. */
    customIdStartsWith(prefix: string): boolean {
        return this.customId.startsWith(prefix);
    }

    /** Check if the custom_id matches a regex. Returns the match or null. */
    customIdMatches(pattern: RegExp): RegExpMatchArray | null {
        return this.customId.match(pattern);
    }

    /** The selected values. */
    get values(): string[] {
        return this.data?.values ?? [];
    }

    /** Acknowledge the interaction without changing the message. */
    async deferUpdate(): Promise<void> {
        await this.client.respondInteraction(this.id, this.token, {
            type: 6 as InteractionResponseType,
        });
    }

    /** Update the message the select menu is attached to. */
    async update(options: InteractionReplyOptions | string): Promise<void> {
        const opts = typeof options === "string" ? { content: options } : options;
        await this.client.respondInteraction(this.id, this.token, {
            type: 7 as InteractionResponseType,
            data: opts as unknown as APIInteractionCallbackData,
        });
    }
}
