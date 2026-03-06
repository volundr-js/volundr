import type { GatewayMessageReactionAddData, Snowflake } from "@volundr/types";
import { Collector, type BaseCollectorOptions } from "./Collector.js";

export interface ReactionCollectorOptions extends BaseCollectorOptions<GatewayMessageReactionAddData> {
    /** Max unique emojis to collect. */
    maxEmojis?: number;
    /** Max unique users to collect from. */
    maxUsers?: number;
}

export class ReactionCollector extends Collector<string, GatewayMessageReactionAddData> {
    readonly messageId: Snowflake;
    private readonly maxEmojis: number;
    private readonly maxUsers: number;
    readonly users = new Set<Snowflake>();
    private readonly emojis = new Set<string>();

    readonly handler: (reaction: GatewayMessageReactionAddData) => void;

    constructor(messageId: Snowflake, options: ReactionCollectorOptions = {}) {
        super(options);
        this.messageId = messageId;
        this.maxEmojis = options.maxEmojis ?? Infinity;
        this.maxUsers = options.maxUsers ?? Infinity;

        this.handler = (reaction: GatewayMessageReactionAddData) => {
            if (this.ended) return;
            if (reaction.message_id !== this.messageId) return;

            this.handleCollect(reaction);

            // Track unique users and emojis
            this.users.add(reaction.user_id);
            const emojiKey = reaction.emoji.id ?? reaction.emoji.name ?? "";
            this.emojis.add(emojiKey);

            if (this.users.size >= this.maxUsers) this.stop("maxUsersReached");
            if (this.emojis.size >= this.maxEmojis) this.stop("maxEmojisReached");
        };
    }

    protected getKey(item: GatewayMessageReactionAddData): string {
        const emojiKey = item.emoji.id ?? item.emoji.name ?? "";
        return `${item.user_id}:${emojiKey}`;
    }
}
