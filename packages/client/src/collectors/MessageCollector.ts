import type { Snowflake } from "@volundr/types";
import { Collector, type BaseCollectorOptions } from "./Collector.js";
import type { Message } from "../entities/Message.js";

export interface CollectorOptions extends BaseCollectorOptions<Message> {
    /** Channel to collect messages from. */
    channelId?: Snowflake;
}

export class MessageCollector extends Collector<Snowflake, Message> {
    readonly channelId: Snowflake;

    readonly handler: (msg: Message) => void;
    readonly disposeHandler: (msg: Message) => void;

    constructor(channelId: Snowflake, options: CollectorOptions = {}) {
        super(options);
        this.channelId = channelId;

        this.handler = (msg: Message) => {
            if (msg.channelId !== this.channelId) return;
            this.handleCollect(msg);
        };

        this.disposeHandler = (msg: Message) => {
            if (msg.channelId !== this.channelId) return;
            this.handleDispose(msg);
        };
    }

    protected getKey(item: Message): Snowflake {
        return item.id;
    }
}
