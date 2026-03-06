import type { APIInteraction, APIUser, APIMessage, APIGuildMember, Snowflake } from "@volundr/types";
import { BaseInteraction } from "./BaseInteraction.js";
import type { Client } from "../../Client.js";
import type { User } from "../User.js";
import { Message } from "../Message.js";

/** Application command types */
const enum ApplicationCommandType {
    ChatInput = 1,
    User = 2,
    Message = 3,
}

export class ContextMenuInteraction extends BaseInteraction {
    /** The command name. */
    get commandName(): string {
        return this.data?.name ?? "";
    }

    /** The command ID. */
    get commandId(): Snowflake {
        return this.data?.id ?? "";
    }

    /** The command type (2 = User, 3 = Message). */
    get commandType(): number {
        return this.data?.type ?? 0;
    }

    /** Whether this is a user context menu command. */
    isUserContextMenu(): boolean {
        return this.commandType === ApplicationCommandType.User;
    }

    /** Whether this is a message context menu command. */
    isMessageContextMenu(): boolean {
        return this.commandType === ApplicationCommandType.Message;
    }

    /** The target user ID (for user context menus). */
    get targetId(): Snowflake | null {
        return this.data?.target_id ?? null;
    }

    /** Get the target user (for user context menus). */
    getTargetUser(): User | null {
        const id = this.targetId;
        if (!id) return null;
        return this.client.users.get(id) ?? null;
    }

    /** Get the target message (for message context menus). */
    getTargetMessage(): Message | null {
        const id = this.targetId;
        if (!id || !this.channelId) return null;
        const resolved = this.data?.resolved as Record<string, unknown> | undefined;
        const messages = resolved?.messages as Record<string, APIMessage> | undefined;
        const raw = messages?.[id];
        if (!raw) return null;
        return new Message(this.client, raw);
    }
}
