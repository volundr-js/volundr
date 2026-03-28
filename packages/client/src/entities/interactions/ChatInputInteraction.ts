import type { APIInteraction, APIApplicationCommandOption, APIAttachment, Snowflake } from "@volundr/types";
import { BaseInteraction } from "./BaseInteraction.js";
import type { Client } from "../../Client.js";
import type { User } from "../User.js";
import type { GuildMember } from "../GuildMember.js";
import type { Channel } from "../channels/index.js";
import type { Role } from "../Role.js";

/** Application command option types */
const enum OptionType {
    SubCommand = 1,
    SubCommandGroup = 2,
    String = 3,
    Integer = 4,
    Boolean = 5,
    User = 6,
    Channel = 7,
    Role = 8,
    Mentionable = 9,
    Number = 10,
    Attachment = 11,
}

export class InteractionOptions {
    private readonly options: APIApplicationCommandOption[];
    private readonly resolved: APIInteraction["data"];

    constructor(options: APIApplicationCommandOption[], data?: APIInteraction["data"]) {
        this.options = options ?? [];
        this.resolved = data;
    }

    /** Get the raw option by name. Searches up to 2 levels deep (subcommand groups). */
    get(name: string): APIApplicationCommandOption | undefined {
        // Check top-level first
        let opt = this.options.find((o) => o.name === name);
        if (opt) return opt;

        // Then subcommand/group options (1 level deep)
        for (const o of this.options) {
            if (o.options) {
                opt = o.options.find((sub) => sub.name === name);
                if (opt) return opt;

                // Then nested subcommand options inside groups (2 levels deep)
                for (const sub of o.options) {
                    if (sub.options) {
                        opt = sub.options.find((nested) => nested.name === name);
                        if (opt) return opt;
                    }
                }
            }
        }
        return undefined;
    }

    /** Get a string option value. */
    getString(name: string, required?: boolean): string | null {
        const opt = this.get(name);
        if (!opt || opt.value === undefined) return required ? "" : null;
        return String(opt.value);
    }

    /** Get an integer option value. */
    getInteger(name: string, required?: boolean): number | null {
        const opt = this.get(name);
        if (!opt || opt.value === undefined) return required ? 0 : null;
        return Number(opt.value);
    }

    /** Get a number option value. */
    getNumber(name: string, required?: boolean): number | null {
        return this.getInteger(name, required);
    }

    /** Get a boolean option value. */
    getBoolean(name: string, required?: boolean): boolean | null {
        const opt = this.get(name);
        if (!opt || opt.value === undefined) return required ? false : null;
        return Boolean(opt.value);
    }

    /** Get a user option value (returns the Snowflake ID). */
    getUserId(name: string): Snowflake | null {
        const opt = this.get(name);
        if (!opt || opt.value === undefined) return null;
        return String(opt.value);
    }

    /** Get a channel option value (returns the Snowflake ID). */
    getChannelId(name: string): Snowflake | null {
        const opt = this.get(name);
        if (!opt || opt.value === undefined) return null;
        return String(opt.value);
    }

    /** Get a role option value (returns the Snowflake ID). */
    getRoleId(name: string): Snowflake | null {
        const opt = this.get(name);
        if (!opt || opt.value === undefined) return null;
        return String(opt.value);
    }

    /** Get the subcommand name, if any. Also searches inside subcommand groups. */
    getSubcommand(): string | null {
        const sub = this.options.find((o) => o.type === OptionType.SubCommand);
        if (sub) return sub.name;

        // Search inside subcommand groups
        const group = this.options.find((o) => o.type === OptionType.SubCommandGroup);
        if (group?.options) {
            const nested = group.options.find((o) => o.type === OptionType.SubCommand);
            if (nested) return nested.name;
        }

        return null;
    }

    /** Get the subcommand group name, if any. */
    getSubcommandGroup(): string | null {
        const group = this.options.find((o) => o.type === OptionType.SubCommandGroup);
        return group?.name ?? null;
    }

    /** Get the focused option (for autocomplete). */
    getFocused(): { name: string; value: string | number } | null {
        for (const opt of this.options) {
            if (opt.focused) return { name: opt.name, value: opt.value as string | number };
            if (opt.options) {
                for (const sub of opt.options) {
                    if (sub.focused) return { name: sub.name, value: sub.value as string | number };
                }
            }
        }
        return null;
    }

    /** Get a resolved User entity from a user option. */
    getUser(name: string, client: Client): User | null {
        const id = this.getUserId(name);
        if (!id) return null;
        return client.users.get(id) ?? null;
    }

    /** Get a resolved GuildMember from a user option. */
    getMember(name: string, client: Client): GuildMember | null {
        const id = this.getUserId(name);
        if (!id) return null;
        const resolved = this.resolved as Record<string, unknown> | undefined;
        const guildId = (resolved as { guild_id?: string })?.guild_id;
        if (!guildId) return null;
        const guild = client.guilds.get(guildId);
        return guild?.members.get(id) ?? null;
    }

    /** Get a resolved Channel from a channel option. */
    getChannel(name: string, client: Client): Channel | null {
        const id = this.getChannelId(name);
        if (!id) return null;
        return client.channels.get(id) ?? null;
    }

    /** Get a resolved Role from a role option. */
    getRole(name: string, client: Client): Role | null {
        const id = this.getRoleId(name);
        if (!id) return null;
        // Search across all guild roles
        for (const guild of client.guilds.values()) {
            const role = guild.roles.get(id);
            if (role) return role;
        }
        return null;
    }

    /** Get a resolved attachment by option name. */
    getAttachment(name: string): APIAttachment | null {
        const opt = this.get(name);
        if (!opt || opt.value === undefined) return null;
        const attachments = (this.resolved as Record<string, unknown>)?.resolved as Record<string, unknown> | undefined;
        const attachmentMap = (attachments as { attachments?: Record<string, APIAttachment> })?.attachments;
        return attachmentMap?.[String(opt.value)] ?? null;
    }
}

export class ChatInputInteraction extends BaseInteraction {
    /** The command name. */
    get commandName(): string {
        return this.data?.name ?? "";
    }

    /** The command ID. */
    get commandId(): Snowflake {
        return this.data?.id ?? "";
    }

    /** Parsed options. */
    get options(): InteractionOptions {
        return new InteractionOptions(this.data?.options ?? [], this.data);
    }
}
