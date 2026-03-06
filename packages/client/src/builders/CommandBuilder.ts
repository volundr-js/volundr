import type {
    CreateApplicationCommandData,
    APIApplicationCommandOptionData,
    APIApplicationCommandOptionChoice,
    LocaleString,
} from "@volundr/types";
import { ApplicationCommandOptionType, ApplicationCommandType } from "@volundr/types";

// ── Validation ─────────────────────────────────────────────────

const COMMAND_NAME_REGEX = /^[\p{Ll}\p{N}_-]{1,32}$/u;

function validateCommandName(name: string, label: string): void {
    if (name.length < 1 || name.length > 32) {
        throw new RangeError(`${label} name must be between 1 and 32 characters (got ${name.length})`);
    }
    if (!COMMAND_NAME_REGEX.test(name)) {
        throw new RangeError(
            `${label} name must only contain lowercase letters, numbers, hyphens, and underscores`,
        );
    }
}

function validateDescription(description: string, label: string): void {
    if (description.length < 1 || description.length > 100) {
        throw new RangeError(`${label} description must be between 1 and 100 characters (got ${description.length})`);
    }
}

function validateChoiceName(name: string): void {
    if (name.length < 1 || name.length > 100) {
        throw new RangeError(`Choice name must be between 1 and 100 characters (got ${name.length})`);
    }
}

function validateChoiceValue(value: string): void {
    if (value.length > 100) {
        throw new RangeError(`Choice string value must not exceed 100 characters (got ${value.length})`);
    }
}

// ── Shared helpers ─────────────────────────────────────────────

type OptionCallback = (builder: SlashCommandOptionBuilder) => SlashCommandOptionBuilder;

function buildOption(type: ApplicationCommandOptionType, fn: OptionCallback): APIApplicationCommandOptionData {
    const builder = new SlashCommandOptionBuilder(type);
    fn(builder);
    return builder.toJSON();
}

function addOptionToList(
    options: APIApplicationCommandOptionData[],
    type: ApplicationCommandOptionType,
    fn: OptionCallback,
    label: string,
): void {
    options.push(buildOption(type, fn));
    if (options.length > 25) {
        throw new RangeError(`${label} cannot have more than 25 options (got ${options.length})`);
    }
}

// ── SlashCommandOptionBuilder ──────────────────────────────────

export class SlashCommandOptionBuilder {
    private data: Partial<APIApplicationCommandOptionData>;

    constructor(type: ApplicationCommandOptionType) {
        this.data = { type };
    }

    setName(name: string): this {
        validateCommandName(name, "Option");
        this.data.name = name;
        return this;
    }

    setNameLocalizations(localizations: Partial<Record<LocaleString, string>> | null): this {
        this.data.name_localizations = localizations;
        return this;
    }

    setDescription(description: string): this {
        validateDescription(description, "Option");
        this.data.description = description;
        return this;
    }

    setDescriptionLocalizations(localizations: Partial<Record<LocaleString, string>> | null): this {
        this.data.description_localizations = localizations;
        return this;
    }

    setRequired(required = true): this {
        this.data.required = required;
        return this;
    }

    addChoices(...choices: APIApplicationCommandOptionChoice[]): this {
        if (!this.data.choices) this.data.choices = [];
        for (const choice of choices) {
            validateChoiceName(choice.name);
            if (typeof choice.value === "string") validateChoiceValue(choice.value);
        }
        this.data.choices.push(...choices);
        if (this.data.choices.length > 25) {
            throw new RangeError(`Option cannot have more than 25 choices (got ${this.data.choices.length})`);
        }
        return this;
    }

    setAutocomplete(autocomplete = true): this {
        this.data.autocomplete = autocomplete;
        return this;
    }

    addChannelTypes(...types: number[]): this {
        if (!this.data.channel_types) this.data.channel_types = [];
        this.data.channel_types.push(...types);
        return this;
    }

    setMinLength(min: number): this {
        if (min < 0 || min > 6000) {
            throw new RangeError(`Option min_length must be between 0 and 6000 (got ${min})`);
        }
        this.data.min_length = min;
        return this;
    }

    setMaxLength(max: number): this {
        if (max < 1 || max > 6000) {
            throw new RangeError(`Option max_length must be between 1 and 6000 (got ${max})`);
        }
        this.data.max_length = max;
        return this;
    }

    setMinValue(min: number): this {
        this.data.min_value = min;
        return this;
    }

    setMaxValue(max: number): this {
        this.data.max_value = max;
        return this;
    }

    toJSON(): APIApplicationCommandOptionData {
        return { ...this.data } as APIApplicationCommandOptionData;
    }
}

// ── SlashCommandSubcommandBuilder ──────────────────────────────

export class SlashCommandSubcommandBuilder {
    private data: Partial<APIApplicationCommandOptionData> = {
        type: ApplicationCommandOptionType.SubCommand,
    };
    private options: APIApplicationCommandOptionData[] = [];

    setName(name: string): this {
        validateCommandName(name, "Subcommand");
        this.data.name = name;
        return this;
    }

    setNameLocalizations(localizations: Partial<Record<LocaleString, string>> | null): this {
        this.data.name_localizations = localizations;
        return this;
    }

    setDescription(description: string): this {
        validateDescription(description, "Subcommand");
        this.data.description = description;
        return this;
    }

    setDescriptionLocalizations(localizations: Partial<Record<LocaleString, string>> | null): this {
        this.data.description_localizations = localizations;
        return this;
    }

    addStringOption(fn: OptionCallback): this {
        addOptionToList(this.options, ApplicationCommandOptionType.String, fn, "Subcommand");
        return this;
    }

    addIntegerOption(fn: OptionCallback): this {
        addOptionToList(this.options, ApplicationCommandOptionType.Integer, fn, "Subcommand");
        return this;
    }

    addBooleanOption(fn: OptionCallback): this {
        addOptionToList(this.options, ApplicationCommandOptionType.Boolean, fn, "Subcommand");
        return this;
    }

    addUserOption(fn: OptionCallback): this {
        addOptionToList(this.options, ApplicationCommandOptionType.User, fn, "Subcommand");
        return this;
    }

    addChannelOption(fn: OptionCallback): this {
        addOptionToList(this.options, ApplicationCommandOptionType.Channel, fn, "Subcommand");
        return this;
    }

    addRoleOption(fn: OptionCallback): this {
        addOptionToList(this.options, ApplicationCommandOptionType.Role, fn, "Subcommand");
        return this;
    }

    addMentionableOption(fn: OptionCallback): this {
        addOptionToList(this.options, ApplicationCommandOptionType.Mentionable, fn, "Subcommand");
        return this;
    }

    addNumberOption(fn: OptionCallback): this {
        addOptionToList(this.options, ApplicationCommandOptionType.Number, fn, "Subcommand");
        return this;
    }

    addAttachmentOption(fn: OptionCallback): this {
        addOptionToList(this.options, ApplicationCommandOptionType.Attachment, fn, "Subcommand");
        return this;
    }

    toJSON(): APIApplicationCommandOptionData {
        return {
            ...this.data,
            options: this.options.length > 0 ? [...this.options] : undefined,
        } as APIApplicationCommandOptionData;
    }
}

// ── SlashCommandSubcommandGroupBuilder ─────────────────────────

export class SlashCommandSubcommandGroupBuilder {
    private data: Partial<APIApplicationCommandOptionData> = {
        type: ApplicationCommandOptionType.SubCommandGroup,
    };
    private subcommands: APIApplicationCommandOptionData[] = [];

    setName(name: string): this {
        validateCommandName(name, "Subcommand group");
        this.data.name = name;
        return this;
    }

    setNameLocalizations(localizations: Partial<Record<LocaleString, string>> | null): this {
        this.data.name_localizations = localizations;
        return this;
    }

    setDescription(description: string): this {
        validateDescription(description, "Subcommand group");
        this.data.description = description;
        return this;
    }

    setDescriptionLocalizations(localizations: Partial<Record<LocaleString, string>> | null): this {
        this.data.description_localizations = localizations;
        return this;
    }

    addSubcommand(fn: (builder: SlashCommandSubcommandBuilder) => SlashCommandSubcommandBuilder): this {
        const builder = new SlashCommandSubcommandBuilder();
        fn(builder);
        this.subcommands.push(builder.toJSON());
        if (this.subcommands.length > 25) {
            throw new RangeError(
                `Subcommand group cannot have more than 25 subcommands (got ${this.subcommands.length})`,
            );
        }
        return this;
    }

    toJSON(): APIApplicationCommandOptionData {
        return {
            ...this.data,
            options: this.subcommands.length > 0 ? [...this.subcommands] : undefined,
        } as APIApplicationCommandOptionData;
    }
}

// ── SlashCommandBuilder ────────────────────────────────────────

export class SlashCommandBuilder {
    private data: Partial<CreateApplicationCommandData> = {
        type: ApplicationCommandType.ChatInput,
    };
    private options: APIApplicationCommandOptionData[] = [];

    setName(name: string): this {
        validateCommandName(name, "Command");
        this.data.name = name;
        return this;
    }

    setNameLocalizations(localizations: Partial<Record<LocaleString, string>> | null): this {
        this.data.name_localizations = localizations;
        return this;
    }

    setDescription(description: string): this {
        validateDescription(description, "Command");
        this.data.description = description;
        return this;
    }

    setDescriptionLocalizations(localizations: Partial<Record<LocaleString, string>> | null): this {
        this.data.description_localizations = localizations;
        return this;
    }

    setDefaultMemberPermissions(permissions: bigint | string | null): this {
        this.data.default_member_permissions = permissions === null ? null : String(permissions);
        return this;
    }

    setDMPermission(allowed: boolean): this {
        this.data.dm_permission = allowed;
        return this;
    }

    setNSFW(nsfw = true): this {
        this.data.nsfw = nsfw;
        return this;
    }

    // --- Options ---

    addStringOption(fn: OptionCallback): this {
        this.guardNoSubcommands("addStringOption");
        addOptionToList(this.options, ApplicationCommandOptionType.String, fn, "Command");
        return this;
    }

    addIntegerOption(fn: OptionCallback): this {
        this.guardNoSubcommands("addIntegerOption");
        addOptionToList(this.options, ApplicationCommandOptionType.Integer, fn, "Command");
        return this;
    }

    addBooleanOption(fn: OptionCallback): this {
        this.guardNoSubcommands("addBooleanOption");
        addOptionToList(this.options, ApplicationCommandOptionType.Boolean, fn, "Command");
        return this;
    }

    addUserOption(fn: OptionCallback): this {
        this.guardNoSubcommands("addUserOption");
        addOptionToList(this.options, ApplicationCommandOptionType.User, fn, "Command");
        return this;
    }

    addChannelOption(fn: OptionCallback): this {
        this.guardNoSubcommands("addChannelOption");
        addOptionToList(this.options, ApplicationCommandOptionType.Channel, fn, "Command");
        return this;
    }

    addRoleOption(fn: OptionCallback): this {
        this.guardNoSubcommands("addRoleOption");
        addOptionToList(this.options, ApplicationCommandOptionType.Role, fn, "Command");
        return this;
    }

    addMentionableOption(fn: OptionCallback): this {
        this.guardNoSubcommands("addMentionableOption");
        addOptionToList(this.options, ApplicationCommandOptionType.Mentionable, fn, "Command");
        return this;
    }

    addNumberOption(fn: OptionCallback): this {
        this.guardNoSubcommands("addNumberOption");
        addOptionToList(this.options, ApplicationCommandOptionType.Number, fn, "Command");
        return this;
    }

    addAttachmentOption(fn: OptionCallback): this {
        this.guardNoSubcommands("addAttachmentOption");
        addOptionToList(this.options, ApplicationCommandOptionType.Attachment, fn, "Command");
        return this;
    }

    // --- Subcommands ---

    addSubcommand(fn: (builder: SlashCommandSubcommandBuilder) => SlashCommandSubcommandBuilder): this {
        this.guardNoOptions("addSubcommand");
        const builder = new SlashCommandSubcommandBuilder();
        fn(builder);
        this.options.push(builder.toJSON());
        if (this.options.length > 25) {
            throw new RangeError(`Command cannot have more than 25 options (got ${this.options.length})`);
        }
        return this;
    }

    addSubcommandGroup(
        fn: (builder: SlashCommandSubcommandGroupBuilder) => SlashCommandSubcommandGroupBuilder,
    ): this {
        this.guardNoOptions("addSubcommandGroup");
        const builder = new SlashCommandSubcommandGroupBuilder();
        fn(builder);
        this.options.push(builder.toJSON());
        if (this.options.length > 25) {
            throw new RangeError(`Command cannot have more than 25 options (got ${this.options.length})`);
        }
        return this;
    }

    // --- Guards ---

    private guardNoSubcommands(method: string): void {
        if (this.options.some((o) =>
            o.type === ApplicationCommandOptionType.SubCommand ||
            o.type === ApplicationCommandOptionType.SubCommandGroup,
        )) {
            throw new RangeError(`Cannot use ${method} when subcommands or subcommand groups have been added`);
        }
    }

    private guardNoOptions(method: string): void {
        if (this.options.some((o) =>
            o.type !== ApplicationCommandOptionType.SubCommand &&
            o.type !== ApplicationCommandOptionType.SubCommandGroup,
        )) {
            throw new RangeError(`Cannot use ${method} when regular options have been added`);
        }
    }

    toJSON(): CreateApplicationCommandData {
        return {
            ...this.data,
            options: this.options.length > 0 ? [...this.options] : undefined,
        } as CreateApplicationCommandData;
    }
}

// ── ContextMenuCommandBuilder ──────────────────────────────────

export class ContextMenuCommandBuilder {
    private data: Partial<CreateApplicationCommandData> = {};

    setName(name: string): this {
        if (name.length < 1 || name.length > 32) {
            throw new RangeError(
                `Context menu command name must be between 1 and 32 characters (got ${name.length})`,
            );
        }
        this.data.name = name;
        return this;
    }

    setNameLocalizations(localizations: Partial<Record<LocaleString, string>> | null): this {
        this.data.name_localizations = localizations;
        return this;
    }

    setType(type: ApplicationCommandType.User | ApplicationCommandType.Message): this {
        this.data.type = type;
        return this;
    }

    setDefaultMemberPermissions(permissions: bigint | string | null): this {
        this.data.default_member_permissions = permissions === null ? null : String(permissions);
        return this;
    }

    setDMPermission(allowed: boolean): this {
        this.data.dm_permission = allowed;
        return this;
    }

    setNSFW(nsfw = true): this {
        this.data.nsfw = nsfw;
        return this;
    }

    toJSON(): CreateApplicationCommandData {
        return { ...this.data } as CreateApplicationCommandData;
    }
}
