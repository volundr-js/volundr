import { Logger } from "@volundr/logger";
import { GatewayOpcodes } from "./types.js";

const log = Logger.getLogger("gateway", "Heartbeat");

export class Heartbeat {
    private interval: ReturnType<typeof setInterval> | null = null;
    private acked = true;

    constructor(
        private readonly send: (op: GatewayOpcodes, d: unknown) => void,
        private readonly onZombie: () => void,
    ) {}

    start(intervalMs: number, sequence: () => number | null): void {
        this.stop();
        this.acked = true;

        const jitter = Math.random();
        log.info(`Starting heartbeat every ${intervalMs}ms (jitter ${(jitter * 100).toFixed(0)}%)`);

        setTimeout(() => {
            this.beat(sequence);
            this.interval = setInterval(() => this.beat(sequence), intervalMs);
        }, intervalMs * jitter);
    }

    private beat(sequence: () => number | null): void {
        if (!this.acked) {
            log.warn("No ACK received, connection is zombie");
            this.stop();
            this.onZombie();
            return;
        }

        this.acked = false;
        const seq = sequence();
        log.debug(() => `Sending heartbeat (seq=${seq})`);
        this.send(GatewayOpcodes.Heartbeat, seq);
    }

    ack(): void {
        this.acked = true;
        log.debug("ACK received");
    }

    stop(): void {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
            log.debug("Stopped");
        }
    }
}
