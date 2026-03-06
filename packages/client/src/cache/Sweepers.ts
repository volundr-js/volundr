import { Logger } from "@volundr/logger";
import type { Snowflake } from "@volundr/types";
import type { Collection } from "../collection/Collection.js";
import type { Client } from "../Client.js";
import type { Guild } from "../entities/Guild.js";
import type { Channel } from "../entities/channels/index.js";
import type { User } from "../entities/User.js";
import type { GuildMember } from "../entities/GuildMember.js";
import type { Message } from "../entities/Message.js";
import type { Presence } from "../entities/Presence.js";

const log = Logger.getLogger("client", "Sweepers");

export interface SweeperFilterFn<V> {
    (value: V, key: Snowflake): boolean;
}

export interface SweeperOptions<V> {
    /** Interval in milliseconds between sweeps. */
    interval: number;
    /** Filter function: return true to REMOVE the entry. */
    filter: SweeperFilterFn<V>;
}

export interface SweeperConfig {
    guilds?: SweeperOptions<Guild>;
    channels?: SweeperOptions<Channel>;
    users?: SweeperOptions<User>;
    members?: SweeperOptions<GuildMember>;
    messages?: SweeperOptions<Message>;
    presences?: SweeperOptions<Presence>;
}

/** Lifetime filter: removes entries older than the given lifetime (ms). */
export function lifetimeFilter<V extends { createdTimestamp?: number }>(lifetime: number): SweeperFilterFn<V> {
    // Capture `now` once per sweep tick, not per entity
    let now = Date.now();
    const fn: SweeperFilterFn<V> = (value) => {
        if (!value.createdTimestamp) return false;
        return now - value.createdTimestamp > lifetime;
    };
    // Expose a refresh hook for the sweep interval to call
    (fn as any)._refreshNow = () => { now = Date.now(); };
    return fn;
}

/** Message lifetime filter using the message's createdTimestamp. */
export function messageLifetimeFilter(lifetime: number): SweeperFilterFn<Message> {
    let now = Date.now();
    const fn: SweeperFilterFn<Message> = (msg) => now - msg.createdTimestamp > lifetime;
    (fn as any)._refreshNow = () => { now = Date.now(); };
    return fn;
}

export class Sweepers {
    private readonly client: Client;
    private readonly timers: NodeJS.Timeout[] = [];

    constructor(client: Client, config: SweeperConfig) {
        this.client = client;

        if (config.guilds) this.setupSweeper("guilds", client.guilds, config.guilds);
        if (config.channels) this.setupSweeper("channels", client.channels, config.channels);
        if (config.users) this.setupSweeper("users", client.users, config.users);
        if (config.members) this.setupMemberSweeper(config.members);
        if (config.messages) this.setupMessageSweeper(config.messages);
        if (config.presences) this.setupPresenceSweeper(config.presences);
    }

    private setupSweeper<V>(name: string, collection: Collection<Snowflake, V>, options: SweeperOptions<V>): void {
        const timer = setInterval(() => {
            (options.filter as any)?._refreshNow?.();
            const before = collection.size;
            collection.sweep(options.filter);
            const swept = before - collection.size;
            if (swept > 0) log.debug(() => `Swept ${swept} ${name}`);
        }, options.interval);
        timer.unref();
        this.timers.push(timer);
    }

    private setupMemberSweeper(options: SweeperOptions<GuildMember>): void {
        const timer = setInterval(() => {
            (options.filter as any)?._refreshNow?.();
            let total = 0;
            for (const guild of this.client.guilds.values()) {
                const before = guild.members.size;
                guild.members.sweep(options.filter);
                total += before - guild.members.size;
            }
            if (total > 0) log.debug(() => `Swept ${total} members`);
        }, options.interval);
        timer.unref();
        this.timers.push(timer);
    }

    private setupMessageSweeper(options: SweeperOptions<Message>): void {
        const timer = setInterval(() => {
            (options.filter as any)?._refreshNow?.();
            let total = 0;
            const messageStore = this.client.messageCache;
            for (const [channelId, store] of messageStore) {
                const before = store.size;
                store.sweep(options.filter);
                total += before - store.size;
                if (store.size === 0) messageStore.delete(channelId);
            }
            if (total > 0) log.debug(() => `Swept ${total} messages`);
        }, options.interval);
        timer.unref();
        this.timers.push(timer);
    }

    private setupPresenceSweeper(options: SweeperOptions<Presence>): void {
        const timer = setInterval(() => {
            (options.filter as any)?._refreshNow?.();
            let total = 0;
            for (const guild of this.client.guilds.values()) {
                const before = guild.presences.size;
                guild.presences.sweep(options.filter);
                total += before - guild.presences.size;
            }
            if (total > 0) log.debug(() => `Swept ${total} presences`);
        }, options.interval);
        timer.unref();
        this.timers.push(timer);
    }

    /** Stop all sweeper intervals. */
    destroy(): void {
        for (const timer of this.timers) clearInterval(timer);
        this.timers.length = 0;
    }
}
