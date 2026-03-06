import type { RestClient } from "@volundr/rest";
import type { GatewayReadyData, GatewayEvents } from "@volundr/types";

export enum GatewayOpcodes {
    Dispatch = 0,
    Heartbeat = 1,
    Identify = 2,
    PresenceUpdate = 3,
    VoiceStateUpdate = 4,
    Resume = 6,
    Reconnect = 7,
    RequestGuildMembers = 8,
    InvalidSession = 9,
    Hello = 10,
    HeartbeatAck = 11,
}

export interface GatewayPayload {
    op: GatewayOpcodes;
    d: unknown;
    s: number | null;
    t: string | null;
}

export interface GatewayOptions {
    token: string;
    intents: number;
    rest?: RestClient;
    largeThreshold?: number;
    presence?: GatewayPresence;
    shard?: [number, number];
    /** Enable zlib-stream transport compression. */
    compress?: boolean;
}

export interface GatewayPresence {
    status?: "online" | "dnd" | "idle" | "invisible" | "offline";
    activities?: GatewayActivity[];
    afk?: boolean;
}

export interface GatewayActivity {
    name: string;
    type: number;
    url?: string;
}

export interface GatewayBotData {
    url: string;
    shards: number;
    session_start_limit: {
        total: number;
        remaining: number;
        reset_after: number;
        max_concurrency: number;
    };
}

export interface HelloData {
    heartbeat_interval: number;
}

export type ReadyData = GatewayReadyData;

export type GatewayStatus = "disconnected" | "connecting" | "connected" | "resuming";

export interface GatewayInternalEvents extends GatewayEvents {
    close: number;
    status: GatewayStatus;
    error: Error;
}
