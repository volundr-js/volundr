import { Logger } from "@volundr/logger";

const log = Logger.getLogger("client", "Intents");

/**
 * Maps gateway event names to the intents required to receive them.
 * An event may require any ONE of the listed intents (OR logic).
 */
const EVENT_INTENTS: Record<string, number[]> = {
    // Guilds (1 << 0)
    GUILD_CREATE: [1 << 0],
    GUILD_UPDATE: [1 << 0],
    GUILD_DELETE: [1 << 0],
    GUILD_ROLE_CREATE: [1 << 0],
    GUILD_ROLE_UPDATE: [1 << 0],
    GUILD_ROLE_DELETE: [1 << 0],
    CHANNEL_CREATE: [1 << 0],
    CHANNEL_UPDATE: [1 << 0],
    CHANNEL_DELETE: [1 << 0],
    CHANNEL_PINS_UPDATE: [1 << 0, 1 << 12],
    THREAD_CREATE: [1 << 0],
    THREAD_UPDATE: [1 << 0],
    THREAD_DELETE: [1 << 0],
    THREAD_LIST_SYNC: [1 << 0],
    THREAD_MEMBER_UPDATE: [1 << 0],
    THREAD_MEMBERS_UPDATE: [1 << 0],
    STAGE_INSTANCE_CREATE: [1 << 0],
    STAGE_INSTANCE_UPDATE: [1 << 0],
    STAGE_INSTANCE_DELETE: [1 << 0],

    // Guild Members (1 << 1) - privileged
    GUILD_MEMBER_ADD: [1 << 1],
    GUILD_MEMBER_REMOVE: [1 << 1],
    GUILD_MEMBER_UPDATE: [1 << 1],

    // Guild Moderation (1 << 2)
    GUILD_AUDIT_LOG_ENTRY_CREATE: [1 << 2],
    GUILD_BAN_ADD: [1 << 2],
    GUILD_BAN_REMOVE: [1 << 2],

    // Guild Expressions (1 << 3)
    GUILD_EMOJIS_UPDATE: [1 << 3],
    GUILD_STICKERS_UPDATE: [1 << 3],

    // Guild Integrations (1 << 4)
    GUILD_INTEGRATIONS_UPDATE: [1 << 4],
    INTEGRATION_CREATE: [1 << 4],
    INTEGRATION_UPDATE: [1 << 4],
    INTEGRATION_DELETE: [1 << 4],

    // Guild Webhooks (1 << 5)
    WEBHOOKS_UPDATE: [1 << 5],

    // Guild Invites (1 << 6)
    INVITE_CREATE: [1 << 6],
    INVITE_DELETE: [1 << 6],

    // Guild Voice States (1 << 7)
    VOICE_STATE_UPDATE: [1 << 7],

    // Guild Presences (1 << 8) - privileged
    PRESENCE_UPDATE: [1 << 8],

    // Guild Messages (1 << 9)
    MESSAGE_CREATE: [1 << 9, 1 << 12],
    MESSAGE_UPDATE: [1 << 9, 1 << 12],
    MESSAGE_DELETE: [1 << 9, 1 << 12],
    MESSAGE_DELETE_BULK: [1 << 9],

    // Guild Message Reactions (1 << 10)
    MESSAGE_REACTION_ADD: [1 << 10, 1 << 13],
    MESSAGE_REACTION_REMOVE: [1 << 10, 1 << 13],
    MESSAGE_REACTION_REMOVE_ALL: [1 << 10, 1 << 13],
    MESSAGE_REACTION_REMOVE_EMOJI: [1 << 10, 1 << 13],

    // Guild Message Typing (1 << 11)
    TYPING_START: [1 << 11, 1 << 14],

    // Guild Scheduled Events (1 << 16)
    GUILD_SCHEDULED_EVENT_CREATE: [1 << 16],
    GUILD_SCHEDULED_EVENT_UPDATE: [1 << 16],
    GUILD_SCHEDULED_EVENT_DELETE: [1 << 16],
    GUILD_SCHEDULED_EVENT_USER_ADD: [1 << 16],
    GUILD_SCHEDULED_EVENT_USER_REMOVE: [1 << 16],

    // Auto Moderation Configuration (1 << 20)
    AUTO_MODERATION_RULE_CREATE: [1 << 20],
    AUTO_MODERATION_RULE_UPDATE: [1 << 20],
    AUTO_MODERATION_RULE_DELETE: [1 << 20],

    // Auto Moderation Execution (1 << 21)
    AUTO_MODERATION_ACTION_EXECUTION: [1 << 21],

    // Guild Message Polls (1 << 24)
    MESSAGE_POLL_VOTE_ADD: [1 << 24, 1 << 25],
    MESSAGE_POLL_VOTE_REMOVE: [1 << 24, 1 << 25],
};

const INTENT_NAMES: Record<number, string> = {
    [1 << 0]: "Guilds",
    [1 << 1]: "GuildMembers",
    [1 << 2]: "GuildModeration",
    [1 << 3]: "GuildExpressions",
    [1 << 4]: "GuildIntegrations",
    [1 << 5]: "GuildWebhooks",
    [1 << 6]: "GuildInvites",
    [1 << 7]: "GuildVoiceStates",
    [1 << 8]: "GuildPresences",
    [1 << 9]: "GuildMessages",
    [1 << 10]: "GuildMessageReactions",
    [1 << 11]: "GuildMessageTyping",
    [1 << 12]: "DirectMessages",
    [1 << 13]: "DirectMessageReactions",
    [1 << 14]: "DirectMessageTyping",
    [1 << 15]: "MessageContent",
    [1 << 16]: "GuildScheduledEvents",
    [1 << 20]: "AutoModerationConfiguration",
    [1 << 21]: "AutoModerationExecution",
    [1 << 24]: "GuildMessagePolls",
    [1 << 25]: "DirectMessagePolls",
};

/**
 * Validate that the provided intents cover the given event.
 * Logs a warning if no matching intent is found.
 */
export function validateIntentsForEvent(intents: number, event: string): void {
    const required = EVENT_INTENTS[event];
    if (!required) return; // Unknown event or no intent requirement (like READY, RESUMED)

    const hasAny = required.some((intent) => (intents & intent) !== 0);
    if (!hasAny) {
        const intentNames = required.map((i) => INTENT_NAMES[i] ?? `0x${i.toString(16)}`).join(" or ");
        log.warn(`Listening for "${event}" but missing intent: ${intentNames}. This event will not be received.`);
    }
}

/**
 * Validate all intents at startup - logs a summary of which intents are enabled.
 */
export function logIntentsSummary(intents: number): void {
    const enabled: string[] = [];
    const privileged: string[] = [];

    for (const [bit, name] of Object.entries(INTENT_NAMES)) {
        const bitNum = Number(bit);
        if ((intents & bitNum) !== 0) {
            enabled.push(name);
            if (bitNum === (1 << 1) || bitNum === (1 << 8) || bitNum === (1 << 15)) {
                privileged.push(name);
            }
        }
    }

    log.debug(`Intents enabled: ${enabled.join(", ") || "none"}`);
    if (privileged.length > 0) {
        log.debug(`Privileged intents: ${privileged.join(", ")} (must be enabled in Developer Portal)`);
    }
}
