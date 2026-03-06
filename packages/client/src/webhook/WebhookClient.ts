import type { Snowflake, APIMessage, APIEmbed, APIActionRow } from "@volundr/types";
import { buildFormData } from "@volundr/rest";
import type { FileAttachment } from "@volundr/rest";

const DISCORD_API = "https://discord.com/api/v10";

export interface WebhookMessageOptions {
    content?: string;
    username?: string;
    avatar_url?: string;
    tts?: boolean;
    embeds?: APIEmbed[];
    components?: APIActionRow[];
    thread_id?: Snowflake;
    files?: FileAttachment[];
}

export interface EditWebhookMessageOptions {
    content?: string;
    embeds?: APIEmbed[];
    components?: APIActionRow[];
    files?: FileAttachment[];
}

export class WebhookClient {
    private readonly url: string;
    readonly id: Snowflake;
    readonly token: string;

    constructor(url: string);
    constructor(id: Snowflake, token: string);
    constructor(idOrUrl: string, token?: string) {
        if (token) {
            this.id = idOrUrl;
            this.token = token;
            this.url = `${DISCORD_API}/webhooks/${idOrUrl}/${token}`;
        } else {
            const match = idOrUrl.match(/discord(?:app)?\.com\/api\/webhooks\/(\d+)\/(.+?)(?:\?|$)/);
            if (!match) {
                throw new Error("Invalid webhook URL");
            }
            this.id = match[1];
            this.token = match[2];
            this.url = `${DISCORD_API}/webhooks/${this.id}/${this.token}`;
        }
    }

    async send(options: WebhookMessageOptions): Promise<APIMessage> {
        const query = options.thread_id ? `?thread_id=${options.thread_id}&wait=true` : "?wait=true";
        const body: Record<string, unknown> = {};

        if (options.content !== undefined) body.content = options.content;
        if (options.username !== undefined) body.username = options.username;
        if (options.avatar_url !== undefined) body.avatar_url = options.avatar_url;
        if (options.tts !== undefined) body.tts = options.tts;
        if (options.embeds !== undefined) body.embeds = options.embeds;
        if (options.components !== undefined) body.components = options.components;

        let fetchBody: BodyInit;
        const headers: Record<string, string> = {};

        if (options.files && options.files.length > 0) {
            fetchBody = buildFormData(body, options.files);
        } else {
            headers["Content-Type"] = "application/json";
            fetchBody = JSON.stringify(body);
        }

        const res = await fetch(`${this.url}${query}`, {
            method: "POST",
            headers,
            body: fetchBody,
        });

        if (!res.ok) {
            const text = await res.text();
            throw new Error(`Webhook send failed (${res.status}): ${text}`);
        }

        return res.json() as Promise<APIMessage>;
    }

    async editMessage(messageId: Snowflake, options: EditWebhookMessageOptions): Promise<APIMessage> {
        const { files, ...jsonBody } = options;

        let fetchBody: BodyInit;
        const headers: Record<string, string> = {};

        if (files && files.length > 0) {
            fetchBody = buildFormData(jsonBody, files);
        } else {
            headers["Content-Type"] = "application/json";
            fetchBody = JSON.stringify(jsonBody);
        }

        const res = await fetch(`${this.url}/messages/${messageId}`, {
            method: "PATCH",
            headers,
            body: fetchBody,
        });

        if (!res.ok) {
            const text = await res.text();
            throw new Error(`Webhook edit failed (${res.status}): ${text}`);
        }

        return res.json() as Promise<APIMessage>;
    }

    async deleteMessage(messageId: Snowflake): Promise<void> {
        const res = await fetch(`${this.url}/messages/${messageId}`, {
            method: "DELETE",
        });

        if (!res.ok) {
            const text = await res.text();
            throw new Error(`Webhook delete failed (${res.status}): ${text}`);
        }
    }
}
