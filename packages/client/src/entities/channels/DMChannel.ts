import type { APIChannel, APIMessage, Snowflake } from "@volundr/types";
import { BaseChannel } from "./BaseChannel.js";
import type { Client } from "../../Client.js";
import type { User } from "../User.js";
import { Message } from "../Message.js";
import type { FetchMessagesOptions } from "../../types.js";
import { type MessageInput, resolveMessageInput } from "../../builders/InlineMessage.js";

export class DMChannel extends BaseChannel {
    recipientId!: Snowflake | null;
    lastMessageId!: Snowflake | null;

    constructor(client: Client, data: APIChannel) {
        super(client, data);
    }

    override _patch(data: Partial<APIChannel>): void {
        super._patch(data);
        if (data.recipients?.length) {
            this.recipientId = data.recipients[0].id;
        } else if (this.recipientId === undefined) {
            this.recipientId = null;
        }
        if (data.last_message_id !== undefined) this.lastMessageId = data.last_message_id ?? null;
        else if (this.lastMessageId === undefined) this.lastMessageId = null;
    }

    /** The user on the other end of this DM. */
    get recipient(): User | undefined {
        if (!this.recipientId) return undefined;
        return this.client.users.get(this.recipientId);
    }

    /** Send a message in this DM. Accepts a string, options object, or inline message callback. */
    async send(options: MessageInput): Promise<Message> {
        const opts = resolveMessageInput(options);
        const data = await this.client.createMessage(this.id, opts);
        return new Message(this.client, data);
    }

    /** Fetch messages from this DM. */
    async fetchMessages(options?: FetchMessagesOptions): Promise<Message[]> {
        const data = await this.client.fetchMessages(this.id, options);
        return data.map((d: APIMessage) => new Message(this.client, d));
    }
}
