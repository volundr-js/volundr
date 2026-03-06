import type { InteractionResponseType, APIInteractionCallbackData } from "@volundr/types";
import { BaseInteraction, type InteractionReplyOptions } from "./BaseInteraction.js";

export class ModalSubmitInteraction extends BaseInteraction {
    /** The custom_id of the modal. */
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

    /** Get a text input value by custom_id. */
    getTextInputValue(customId: string): string | null {
        // Modal data has components as action rows with text inputs
        const raw = this.data as unknown as { components?: Array<{ components?: Array<{ custom_id: string; value?: string }> }> };
        if (!raw?.components) return null;
        for (const row of raw.components) {
            if (!row.components) continue;
            for (const component of row.components) {
                if (component.custom_id === customId) return component.value ?? null;
            }
        }
        return null;
    }

    /** Acknowledge the interaction without changing the message. */
    async deferUpdate(): Promise<void> {
        await this.client.respondInteraction(this.id, this.token, {
            type: 6 as InteractionResponseType,
        });
    }

    /** Update the message (if the modal was triggered from a component). */
    async update(options: InteractionReplyOptions | string): Promise<void> {
        const opts = typeof options === "string" ? { content: options } : options;
        await this.client.respondInteraction(this.id, this.token, {
            type: 7 as InteractionResponseType,
            data: opts as unknown as APIInteractionCallbackData,
        });
    }
}
