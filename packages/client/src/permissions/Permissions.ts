export const PermissionFlags = {
    CreateInstantInvite: 1n << 0n,
    KickMembers: 1n << 1n,
    BanMembers: 1n << 2n,
    Administrator: 1n << 3n,
    ManageChannels: 1n << 4n,
    ManageGuild: 1n << 5n,
    AddReactions: 1n << 6n,
    ViewAuditLog: 1n << 7n,
    PrioritySpeaker: 1n << 8n,
    Stream: 1n << 9n,
    ViewChannel: 1n << 10n,
    SendMessages: 1n << 11n,
    SendTTSMessages: 1n << 12n,
    ManageMessages: 1n << 13n,
    EmbedLinks: 1n << 14n,
    AttachFiles: 1n << 15n,
    ReadMessageHistory: 1n << 16n,
    MentionEveryone: 1n << 17n,
    UseExternalEmojis: 1n << 18n,
    ViewGuildInsights: 1n << 19n,
    Connect: 1n << 20n,
    Speak: 1n << 21n,
    MuteMembers: 1n << 22n,
    DeafenMembers: 1n << 23n,
    MoveMembers: 1n << 24n,
    UseVAD: 1n << 25n,
    ChangeNickname: 1n << 26n,
    ManageNicknames: 1n << 27n,
    ManageRoles: 1n << 28n,
    ManageWebhooks: 1n << 29n,
    ManageGuildExpressions: 1n << 30n,
    UseApplicationCommands: 1n << 31n,
    RequestToSpeak: 1n << 32n,
    ManageEvents: 1n << 33n,
    ManageThreads: 1n << 34n,
    CreatePublicThreads: 1n << 35n,
    CreatePrivateThreads: 1n << 36n,
    UseExternalStickers: 1n << 37n,
    SendMessagesInThreads: 1n << 38n,
    UseEmbeddedActivities: 1n << 39n,
    ModerateMembers: 1n << 40n,
    ViewCreatorMonetizationAnalytics: 1n << 41n,
    UseSoundboard: 1n << 42n,
    UseExternalSounds: 1n << 45n,
    SendVoiceMessages: 1n << 46n,
    SendPolls: 1n << 49n,
    UseExternalApps: 1n << 50n,
} as const;

const FLAG_NAMES = new Map<bigint, string>(
    Object.entries(PermissionFlags).map(([name, value]) => [value, name]),
);

export class Permissions {
    readonly bitfield: bigint;

    constructor(bitfield: bigint | string | number = 0n) {
        this.bitfield = typeof bitfield === "string" ? BigInt(bitfield) : BigInt(bitfield);
    }

    has(flag: bigint): boolean {
        if ((this.bitfield & PermissionFlags.Administrator) !== 0n) return true;
        return (this.bitfield & flag) === flag;
    }

    any(...flags: bigint[]): boolean {
        return flags.some((f) => this.has(f));
    }

    add(...flags: bigint[]): Permissions {
        let bits = this.bitfield;
        for (const flag of flags) bits |= flag;
        return new Permissions(bits);
    }

    remove(...flags: bigint[]): Permissions {
        let bits = this.bitfield;
        for (const flag of flags) bits &= ~flag;
        return new Permissions(bits);
    }

    toArray(): string[] {
        const result: string[] = [];
        for (const [value, name] of FLAG_NAMES) {
            if ((this.bitfield & value) === value) {
                result.push(name);
            }
        }
        return result;
    }

    toString(): string {
        return this.bitfield.toString();
    }

    static resolve(...flags: bigint[]): bigint {
        let bits = 0n;
        for (const flag of flags) bits |= flag;
        return bits;
    }

    /** Return a record of all flags mapped to whether this bitfield has them. */
    serialize(): Record<string, boolean> {
        const result: Record<string, boolean> = {};
        for (const [name, value] of Object.entries(PermissionFlags)) {
            result[name] = this.has(value);
        }
        return result;
    }

    /** Check if this permission set equals another. */
    equals(other: Permissions | bigint): boolean {
        const otherBits = other instanceof Permissions ? other.bitfield : other;
        return this.bitfield === otherBits;
    }

    /** Return permission flag names present in `required` but missing from this bitfield. */
    missing(...required: bigint[]): string[] {
        const result: string[] = [];
        for (const flag of required) {
            if (!this.has(flag)) {
                const name = FLAG_NAMES.get(flag);
                if (name) result.push(name);
            }
        }
        return result;
    }

    static fromRole(permissions: string): Permissions {
        return new Permissions(permissions);
    }
}
