import type { Snowflake } from "@volundr/types";
import { Collector, type BaseCollectorOptions } from "./Collector.js";
import type { Interaction } from "../entities/index.js";

export interface ComponentCollectorOptions extends BaseCollectorOptions<Interaction> {
    componentType?: number;
    /** Max unique users to collect from. */
    maxUsers?: number;
    /** Max total component interactions. */
    maxComponents?: number;
}

export class ComponentCollector extends Collector<Snowflake, Interaction> {
    readonly messageId: Snowflake;
    private readonly componentType: number | undefined;
    private readonly maxUsers: number;
    private readonly maxComponents: number;
    private readonly users = new Set<Snowflake>();

    readonly handler: (interaction: Interaction) => void;

    constructor(messageId: Snowflake, options: ComponentCollectorOptions = {}) {
        super(options);
        this.messageId = messageId;
        this.componentType = options.componentType;
        this.maxUsers = options.maxUsers ?? Infinity;
        this.maxComponents = options.maxComponents ?? Infinity;

        this.handler = (interaction: Interaction) => {
            if (this.ended) return;
            if (interaction.type !== 3) return; // MessageComponent type
            if ((interaction as { message?: { id: string } }).message?.id !== this.messageId) return;
            if (this.componentType !== undefined && interaction.data?.component_type !== this.componentType) return;

            this.handleCollect(interaction);

            // Track unique users
            if (interaction.user) {
                this.users.add(interaction.user.id);
                if (this.users.size >= this.maxUsers) this.stop("maxUsersReached");
            }

            if (this.collected.size >= this.maxComponents) this.stop("maxComponentsReached");
        };
    }

    protected getKey(item: Interaction): Snowflake {
        return item.id;
    }
}
