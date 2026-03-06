import type { InteractionResponseType, APIInteractionCallbackData, APIApplicationCommandOptionChoice } from "@volundr/types";
import { BaseInteraction } from "./BaseInteraction.js";
import { InteractionOptions } from "./ChatInputInteraction.js";

export class AutocompleteInteraction extends BaseInteraction {
    /** The command name. */
    get commandName(): string {
        return this.data?.name ?? "";
    }

    /** Parsed options. */
    get options(): InteractionOptions {
        return new InteractionOptions(this.data?.options ?? [], this.data);
    }

    /** The focused option. */
    get focused(): { name: string; value: string | number } | null {
        return this.options.getFocused();
    }

    /** Respond with autocomplete choices. */
    async respond(choices: APIApplicationCommandOptionChoice[]): Promise<void> {
        await this.client.respondInteraction(this.id, this.token, {
            type: 8 as InteractionResponseType, // ApplicationCommandAutocompleteResult
            data: { choices } as unknown as APIInteractionCallbackData,
        });
    }
}
