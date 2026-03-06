import type {
    APIInteraction, APIInteractionData, APIMessage,
    Snowflake, LocaleString, InteractionResponseType, APIInteractionCallbackData,
    APIEmbed, APIActionRow, APITopLevelComponent,
} from "@volundr/types";
import { InteractionType } from "@volundr/types";
import { BaseEntity } from "../Base.js";
import type { Client } from "../../Client.js";
import type { User } from "../User.js";
import type { GuildMember } from "../GuildMember.js";
import type { Guild } from "../Guild.js";
import type { Channel } from "../channels/index.js";
import { Message } from "../Message.js";
import type { FileAttachment } from "@volundr/rest";
import { InlineMessage } from "../../builders/InlineMessage.js";

export interface InteractionReplyOptions {
    content?: string;
    embeds?: APIEmbed[];
    components?: (APIActionRow | APITopLevelComponent)[];
    flags?: number;
    tts?: boolean;
    ephemeral?: boolean;
    files?: FileAttachment[];
}

export class BaseInteraction extends BaseEntity {
    applicationId!: Snowflake;
    type!: InteractionType;
    data!: APIInteractionData | undefined;
    guildId!: Snowflake | null;
    channelId!: Snowflake | null;
    token!: string;
    version!: number;
    appPermissions!: string | undefined;
    locale!: LocaleString | undefined;
    guildLocale!: LocaleString | undefined;

    /** The user who triggered the interaction. Set by EntityFactory. */
    user!: User;
    /** The member, if in a guild. Set by EntityFactory. */
    member!: GuildMember | null;

    private replied = false;
    private deferred = false;

    constructor(client: Client, data: APIInteraction) {
        super(client, data.id);
        this._patch(data);
    }

    _patch(data: Partial<APIInteraction>): void {
        if (data.application_id !== undefined) this.applicationId = data.application_id;
        if (data.type !== undefined) this.type = data.type;
        if (data.data !== undefined) this.data = data.data;
        if (data.guild_id !== undefined) this.guildId = data.guild_id ?? null;
        else if (this.guildId === undefined) this.guildId = null;
        if (data.channel_id !== undefined) this.channelId = data.channel_id ?? null;
        else if (this.channelId === undefined) this.channelId = null;
        if (data.token !== undefined) this.token = data.token;
        if (data.version !== undefined) this.version = data.version;
        if (data.app_permissions !== undefined) this.appPermissions = data.app_permissions;
        if (data.locale !== undefined) this.locale = data.locale;
        if (data.guild_locale !== undefined) this.guildLocale = data.guild_locale;
    }

    /** The guild this interaction occurred in. */
    get guild(): Guild | undefined {
        return this.guildId ? this.client.guilds.get(this.guildId) : undefined;
    }

    /** The channel this interaction occurred in. */
    get channel(): Channel | undefined {
        return this.channelId ? this.client.channels.get(this.channelId) : undefined;
    }

    /** Whether this interaction is in a guild. */
    inGuild(): boolean {
        return this.guildId !== null;
    }

    /** Whether this interaction was triggered by the given user. */
    isFrom(userId: Snowflake): boolean {
        return this.user?.id === userId;
    }

    /** Whether this interaction occurred in the given guild. */
    isFromGuild(guildId: Snowflake): boolean {
        return this.guildId === guildId;
    }

    /** Whether this interaction is a chat input (slash) command. */
    isChatInputCommand(): this is ChatInputInteraction {
        return this.type === InteractionType.ApplicationCommand && this.data?.type === 1;
    }

    /** Whether this interaction is a context menu (user or message) command. */
    isContextMenuCommand(): this is ContextMenuInteraction {
        return this.type === InteractionType.ApplicationCommand && (this.data?.type === 2 || this.data?.type === 3);
    }

    /** Whether this interaction is a button press. */
    isButton(): this is ButtonInteraction {
        return this.type === InteractionType.MessageComponent && this.data?.component_type === 2;
    }

    /** Whether this interaction is a select menu. */
    isSelectMenu(): this is SelectMenuInteraction {
        return this.type === InteractionType.MessageComponent && (this.data?.component_type ?? 0) >= 3;
    }

    /** Whether this interaction is a modal submission. */
    isModalSubmit(): this is ModalSubmitInteraction {
        return this.type === InteractionType.ModalSubmit;
    }

    /** Whether this interaction is an autocomplete. */
    isAutocomplete(): this is AutocompleteInteraction {
        return this.type === InteractionType.ApplicationCommandAutocomplete;
    }

    /** Reply to this interaction. Accepts a string, options object, or inline message callback. */
    async reply(options: InteractionReplyOptions | string | ((msg: InlineMessage) => void)): Promise<void> {
        const opts = typeof options === "function"
            ? (() => { const m = new InlineMessage(); options(m); return m.toOptions() as InteractionReplyOptions; })()
            : typeof options === "string" ? { content: options } : options;
        const flags = opts.ephemeral ? (opts.flags ?? 0) | 64 : opts.flags;
        await this.client.respondInteraction(this.id, this.token, {
            type: 4 as InteractionResponseType, // ChannelMessageWithSource
            data: { ...opts, flags, ephemeral: undefined } as unknown as APIInteractionCallbackData,
            files: opts.files,
        });
        this.replied = true;
    }

    /** Defer the reply (show "thinking..." indicator). */
    async deferReply(options?: { ephemeral?: boolean }): Promise<void> {
        const flags = options?.ephemeral ? 64 : undefined;
        await this.client.respondInteraction(this.id, this.token, {
            type: 5 as InteractionResponseType, // DeferredChannelMessageWithSource
            data: flags ? { flags } as unknown as APIInteractionCallbackData : undefined,
        });
        this.deferred = true;
    }

    /** Edit the initial reply. Accepts a string, options object, or inline message callback. */
    async editReply(options: InteractionReplyOptions | string | ((msg: InlineMessage) => void)): Promise<Message> {
        const opts = typeof options === "function"
            ? (() => { const m = new InlineMessage(); options(m); return m.toOptions(); })()
            : typeof options === "string" ? { content: options } : options;
        const data = await this.client.editInteractionResponse(this.token, opts);
        return new Message(this.client, data);
    }

    /** Delete the initial reply. */
    async deleteReply(): Promise<void> {
        await this.client.deleteInteractionResponse(this.token);
    }

    /** Send a follow-up message. Accepts a string, options object, or inline message callback. */
    async followUp(options: InteractionReplyOptions | string | ((msg: InlineMessage) => void)): Promise<Message> {
        const opts = typeof options === "function"
            ? (() => { const m = new InlineMessage(); options(m); return m.toOptions(); })()
            : typeof options === "string" ? { content: options } : options;
        const data = await this.client.sendFollowup(this.token, opts);
        return new Message(this.client, data);
    }

    /** Show a modal popup. Accepts a modal data object or a ModalBuilder. */
    async showModal(modal: { toJSON?: () => unknown; custom_id?: string; title?: string; components?: unknown[] }): Promise<void> {
        const data = "toJSON" in modal && typeof modal.toJSON === "function" ? modal.toJSON() : modal;
        await this.client.respondInteraction(this.id, this.token, {
            type: 9 as InteractionResponseType, // Modal
            data: data as unknown as APIInteractionCallbackData,
        });
        this.replied = true;
    }

    /** Defer a component update (acknowledge without updating the message). */
    async deferUpdate(): Promise<void> {
        await this.client.respondInteraction(this.id, this.token, {
            type: 6 as InteractionResponseType, // DeferredMessageUpdate
        });
        this.deferred = true;
    }

    /** Update the message the component is attached to. */
    async update(options: InteractionReplyOptions | string | ((msg: InlineMessage) => void)): Promise<void> {
        const opts = typeof options === "function"
            ? (() => { const m = new InlineMessage(); options(m); return m.toOptions() as InteractionReplyOptions; })()
            : typeof options === "string" ? { content: options } : options;
        await this.client.respondInteraction(this.id, this.token, {
            type: 7 as InteractionResponseType, // UpdateMessage
            data: opts as unknown as APIInteractionCallbackData,
            files: opts.files,
        });
        this.replied = true;
    }

    /** Fetch the initial reply message. */
    async fetchReply(): Promise<Message> {
        const appId = this.client.getUserId()!;
        const data = await this.client.rest.get<APIMessage>(`/webhooks/${appId}/${this.token}/messages/@original`);
        return new Message(this.client, data);
    }

    /** Whether the interaction has been replied to. */
    get isReplied(): boolean {
        return this.replied;
    }

    /** Whether the interaction has been deferred. */
    get isDeferred(): boolean {
        return this.deferred;
    }

    toString(): string {
        return `<Interaction:${this.id}>`;
    }

    toJSON(): APIInteraction {
        return {
            id: this.id,
            application_id: this.applicationId,
            type: this.type,
            data: this.data,
            guild_id: this.guildId ?? undefined,
            channel_id: this.channelId ?? undefined,
            token: this.token,
            version: this.version,
            app_permissions: this.appPermissions,
            locale: this.locale,
            guild_locale: this.guildLocale,
            entitlements: [],
        };
    }
}

// Forward declarations - actual classes defined in separate files
import type { ChatInputInteraction } from "./ChatInputInteraction.js";
import type { ContextMenuInteraction } from "./ContextMenuInteraction.js";
import type { ButtonInteraction } from "./ButtonInteraction.js";
import type { SelectMenuInteraction } from "./SelectMenuInteraction.js";
import type { ModalSubmitInteraction } from "./ModalSubmitInteraction.js";
import type { AutocompleteInteraction } from "./AutocompleteInteraction.js";
