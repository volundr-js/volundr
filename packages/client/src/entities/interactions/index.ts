import { InteractionType, type APIInteraction } from "@volundr/types";
import type { Client } from "../../Client.js";
import { BaseInteraction } from "./BaseInteraction.js";
import { ChatInputInteraction } from "./ChatInputInteraction.js";
import { ContextMenuInteraction } from "./ContextMenuInteraction.js";
import { ButtonInteraction } from "./ButtonInteraction.js";
import { SelectMenuInteraction } from "./SelectMenuInteraction.js";
import { ModalSubmitInteraction } from "./ModalSubmitInteraction.js";
import { AutocompleteInteraction } from "./AutocompleteInteraction.js";

export type Interaction =
    | ChatInputInteraction
    | ContextMenuInteraction
    | ButtonInteraction
    | SelectMenuInteraction
    | ModalSubmitInteraction
    | AutocompleteInteraction
    | BaseInteraction;

/**
 * Create the correct Interaction subclass based on interaction type.
 */
export function interactionFrom(client: Client, data: APIInteraction): Interaction {
    switch (data.type) {
        case InteractionType.ApplicationCommand: {
            const cmdType = data.data?.type ?? 1;
            if (cmdType === 2 || cmdType === 3) return new ContextMenuInteraction(client, data);
            return new ChatInputInteraction(client, data);
        }
        case InteractionType.MessageComponent: {
            const componentType = data.data?.component_type ?? 0;
            if (componentType === 2) return new ButtonInteraction(client, data);
            return new SelectMenuInteraction(client, data);
        }
        case InteractionType.ModalSubmit:
            return new ModalSubmitInteraction(client, data);
        case InteractionType.ApplicationCommandAutocomplete:
            return new AutocompleteInteraction(client, data);
        default:
            return new BaseInteraction(client, data);
    }
}

export { BaseInteraction, type InteractionReplyOptions } from "./BaseInteraction.js";
export { ChatInputInteraction, InteractionOptions } from "./ChatInputInteraction.js";
export { ContextMenuInteraction } from "./ContextMenuInteraction.js";
export { ButtonInteraction } from "./ButtonInteraction.js";
export { SelectMenuInteraction } from "./SelectMenuInteraction.js";
export { ModalSubmitInteraction } from "./ModalSubmitInteraction.js";
export { AutocompleteInteraction } from "./AutocompleteInteraction.js";
