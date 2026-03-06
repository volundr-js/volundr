import dgram from "node:dgram";
import { Logger } from "@volundr/logger";
import { TypedEmitter } from "@volundr/types";

const log = Logger.getLogger("gateway", "VoiceUDP");

export interface VoiceUDPEvents {
    error: Error;
    close: void;
}

export class VoiceUDP extends TypedEmitter<VoiceUDPEvents> {
    private socket: dgram.Socket | null = null;
    private readonly remoteIp: string;
    private readonly remotePort: number;

    constructor(ip: string, port: number) {
        super();
        this.remoteIp = ip;
        this.remotePort = port;
    }

    connect(): void {
        this.socket = dgram.createSocket("udp4");

        this.socket.on("error", (err) => {
            log.error(`UDP error: ${err.message}`);
            this.emit("error", err);
        });

        this.socket.on("close", () => {
            log.debug("UDP socket closed");
            this.emit("close", undefined as void);
        });

        log.info(`UDP socket created for ${this.remoteIp}:${this.remotePort}`);
    }

    performIPDiscovery(ssrc: number): Promise<{ ip: string; port: number }> {
        return new Promise((resolve, reject) => {
            if (!this.socket) {
                reject(new Error("UDP socket not connected"));
                return;
            }

            const packet = Buffer.alloc(74);
            packet.writeUInt16BE(0x0001, 0); // Type: Request
            packet.writeUInt16BE(70, 2);     // Length: 70
            packet.writeUInt32BE(ssrc, 4);   // SSRC

            const timeout = setTimeout(() => {
                this.socket?.removeListener("message", onMessage);
                reject(new Error("IP discovery timed out"));
            }, 5000);

            const onMessage = (msg: Buffer) => {
                // Validate response: must be Type=Response (0x0002) and at least 74 bytes
                if (msg.length < 74 || msg.readUInt16BE(0) !== 0x0002) {
                    return; // Not an IP discovery response, ignore
                }

                clearTimeout(timeout);
                this.socket?.removeListener("message", onMessage);

                // Parse response: IP is null-terminated string at byte 8, port is uint16BE at byte 72
                const nullTerminator = msg.indexOf(0, 8);
                const ip = msg.subarray(8, nullTerminator > 8 ? nullTerminator : 72).toString("ascii");
                const port = msg.readUInt16BE(72);

                log.info(`IP Discovery: ${ip}:${port}`);
                resolve({ ip, port });
            };

            this.socket.on("message", onMessage);
            this.socket.send(packet, 0, packet.length, this.remotePort, this.remoteIp, (err) => {
                if (err) {
                    clearTimeout(timeout);
                    this.socket?.removeListener("message", onMessage);
                    reject(err);
                }
            });
        });
    }

    send(packet: Buffer): void {
        if (!this.socket) return;
        this.socket.send(packet, 0, packet.length, this.remotePort, this.remoteIp);
    }

    close(): void {
        if (this.socket) {
            try {
                this.socket.close();
            } catch {
                // Already closed
            }
            this.socket = null;
        }
    }
}
