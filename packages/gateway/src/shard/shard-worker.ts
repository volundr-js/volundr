import { parentPort, workerData } from "node:worker_threads";
import { RestClient } from "@volundr/rest";
import { GatewayEvent } from "@volundr/types";
import { Gateway } from "../Gateway.js";
import type { GatewayPresence } from "../types.js";

interface ShardWorkerData {
    token: string;
    intents: number;
    shard: [number, number];
    largeThreshold?: number;
    presence?: GatewayPresence;
    apiVersion?: number;
    baseUrl?: string;
    maxRetries?: number;
    compress?: boolean;
}

const data = workerData as ShardWorkerData;

const rest = new RestClient({
    token: data.token,
    apiVersion: data.apiVersion,
    baseUrl: data.baseUrl,
    maxRetries: data.maxRetries,
});

const gateway = new Gateway({
    token: data.token,
    intents: data.intents,
    shard: data.shard,
    largeThreshold: data.largeThreshold,
    presence: data.presence,
    compress: data.compress,
    rest,
});

// Forward all gateway events to main thread
for (const event of Object.values(GatewayEvent)) {
    gateway.on(event, (eventData: unknown) => {
        parentPort?.postMessage({ type: "event", event, data: eventData });
    });
}

gateway.on("error", (err: Error) => {
    parentPort?.postMessage({ type: "error", error: err.message });
});

gateway.on("status", (status) => {
    parentPort?.postMessage({ type: "status", status });
});

gateway.on("close", (code: number) => {
    parentPort?.postMessage({ type: "close", code });
});

// Listen for commands from main thread
parentPort?.on("message", (msg: Record<string, unknown>) => {
    if (msg.type === "connect") {
        gateway.connect();
    } else if (msg.type === "disconnect") {
        gateway.disconnect();
        process.exit(0);
    } else if (msg.type === "sendVoiceStateUpdate") {
        gateway.sendVoiceStateUpdate(msg.guildId as string, msg.channelId as string | null, msg.selfMute as boolean, msg.selfDeaf as boolean);
    } else if (msg.type === "requestGuildMembers") {
        gateway.requestGuildMembers(msg.data as Record<string, unknown>);
    } else if (msg.type === "setPresence") {
        gateway.setPresence(msg.presence as import("../types.js").GatewayPresence);
    } else if (msg.type === "eval") {
        const nonce = msg.nonce as string;
        try {
            // eslint-disable-next-line no-eval
            const result = eval(msg.script as string);
            parentPort?.postMessage({ type: "evalResult", nonce, result });
        } catch (err) {
            parentPort?.postMessage({ type: "evalResult", nonce, error: (err as Error).message });
        }
    }
});
