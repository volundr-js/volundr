import { Logger } from "@volundr/logger";
import { TypedEmitter } from "@volundr/types";
import type { Snowflake, APIVoiceState, GatewayVoiceServerUpdateData } from "@volundr/types";
import { VoiceWebSocket } from "./VoiceWebSocket.js";
import type { VoiceReadyData } from "./VoiceWebSocket.js";
import { VoiceUDP } from "./VoiceUDP.js";
import { AudioPlayer } from "./AudioPlayer.js";
import { DAVEManager } from "./DAVEManager.js";

const log = Logger.getLogger("gateway", "VoiceConn");

export type VoiceConnectionStatus = "disconnected" | "connecting" | "connected" | "ready";

export interface VoiceConnectionEvents {
    status: VoiceConnectionStatus;
    ready: VoiceReadyData;
    close: number;
    error: Error;
}

export class VoiceConnection extends TypedEmitter<VoiceConnectionEvents> {
    private status: VoiceConnectionStatus = "disconnected";
    private sessionId: string | null = null;
    private serverData: GatewayVoiceServerUpdateData | null = null;
    private voiceWs: VoiceWebSocket | null = null;
    private udp: VoiceUDP | null = null;
    private player: AudioPlayer | null = null;
    private dave: DAVEManager | null = null;
    private channelId: Snowflake | null = null;
    private ssrc = 0;
    private secretKey: Uint8Array | null = null;

    constructor(
        readonly guildId: Snowflake,
        private readonly userId: Snowflake,
        private readonly sendGatewayVoiceState: (
            guildId: Snowflake,
            channelId: Snowflake | null,
            selfMute: boolean,
            selfDeaf: boolean,
        ) => void,
    ) {
        super();
    }

    joinChannel(channelId: Snowflake, selfMute = false, selfDeaf = false): void {
        // Tear down existing connection before starting a new one
        if (this.status !== "disconnected") {
            this.disconnect();
        }
        this.setStatus("connecting");
        this.sessionId = null;
        this.serverData = null;
        this.sendGatewayVoiceState(this.guildId, channelId, selfMute, selfDeaf);
    }

    leaveChannel(): void {
        this.sendGatewayVoiceState(this.guildId, null, false, false);
        this.disconnect();
    }

    handleVoiceStateUpdate(state: APIVoiceState): void {
        if (state.channel_id === null) {
            this.disconnect();
            return;
        }
        this.sessionId = state.session_id;
        this.channelId = state.channel_id;
        this.tryConnect();
    }

    handleVoiceServerUpdate(data: GatewayVoiceServerUpdateData): void {
        this.serverData = data;
        this.tryConnect();
    }

    disconnect(): void {
        this.player?.stop();
        this.player = null;

        this.dave?.destroy();
        this.dave = null;

        this.udp?.close();
        this.udp = null;

        if (this.voiceWs) {
            this.voiceWs.disconnect();
            this.voiceWs = null;
        }

        this.sessionId = null;
        this.serverData = null;
        this.channelId = null;
        this.secretKey = null;
        this.ssrc = 0;
        this.setStatus("disconnected");
    }

    async [Symbol.asyncDispose](): Promise<void> {
        this.disconnect();
    }

    getStatus(): VoiceConnectionStatus {
        return this.status;
    }

    getAudioPlayer(): AudioPlayer | null {
        return this.player;
    }

    private tryConnect(): void {
        if (!this.sessionId || !this.serverData || !this.serverData.endpoint) {
            return;
        }

        if (!this.channelId) {
            log.warn("tryConnect called without channelId - aborting");
            return;
        }

        // Clean up existing connection
        this.player?.stop();
        this.player = null;
        this.dave?.destroy();
        this.dave = null;
        this.udp?.close();
        this.udp = null;
        if (this.voiceWs) {
            this.voiceWs.disconnect();
            this.voiceWs = null;
        }

        log.info(`Connecting voice for guild ${this.guildId}`);

        this.setStatus("connecting");

        this.voiceWs = new VoiceWebSocket();

        // Create DAVE manager early so it captures clientsConnect events
        this.dave = new DAVEManager(this.userId, this.channelId, this.voiceWs);

        this.voiceWs.on("ready", (data) => {
            this.onVoiceReady(data).catch((err) => {
                log.error(`Voice handshake failed: ${err.message}`);
                this.emit("error", err);
            });
        });

        this.voiceWs.on("sessionDescription", (desc) => {
            this.secretKey = new Uint8Array(desc.secret_key);
            log.info(`Session ready (mode=${desc.mode}, dave_protocol=${desc.dave_protocol_version ?? 0})`);

            // Wait for DAVE handshake before signaling ready
            this.dave!.onReady(() => {
                log.info("Voice connection fully ready (DAVE handshake complete)");

                // Create AudioPlayer with DAVE manager
                if (this.udp && this.voiceWs) {
                    this.player = new AudioPlayer(this.udp, this.voiceWs, this.ssrc, this.secretKey!, this.dave);
                }

                this.setStatus("ready");
                this.emit("ready", { ssrc: this.ssrc, ip: "", port: 0, modes: [] });
            });

            // Initialize DAVE session - will call the onReady callback when handshake completes
            this.dave!.init(desc.dave_protocol_version ?? 0);
        });

        this.voiceWs.on("close", (code) => {
            this.player?.stop();
            this.player = null;
            this.dave?.destroy();
            this.dave = null;
            this.udp?.close();
            this.udp = null;
            this.voiceWs = null;
            this.setStatus("disconnected");
            this.emit("close", code);
        });

        this.voiceWs.on("error", (err) => {
            this.emit("error", err);
        });

        this.voiceWs.connect({
            endpoint: this.serverData.endpoint,
            serverId: this.guildId,
            userId: this.userId,
            sessionId: this.sessionId,
            token: this.serverData.token,
        });
    }

    private async onVoiceReady(data: VoiceReadyData): Promise<void> {
        this.ssrc = data.ssrc;
        log.info(`Available encryption modes: [${data.modes.join(", ")}]`);

        if (data.dave_protocol_version !== undefined) {
            log.info(`DAVE protocol version: ${data.dave_protocol_version}`);
        }

        // Create UDP socket and perform IP discovery
        this.udp = new VoiceUDP(data.ip, data.port);
        this.udp.connect();

        const { ip, port } = await this.udp.performIPDiscovery(data.ssrc);

        // Prefer aead_xchacha20_poly1305_rtpsize (always available on Discord)
        let mode: string;
        if (data.modes.includes("aead_xchacha20_poly1305_rtpsize")) {
            mode = "aead_xchacha20_poly1305_rtpsize";
        } else {
            mode = data.modes[0];
            log.warn(`xchacha20 not available, falling back to: ${mode}`);
        }

        log.info(`Selecting protocol: ${mode}`);
        this.voiceWs!.sendSelectProtocol(ip, port, mode);

        // Session description will arrive via the "sessionDescription" event
    }

    private setStatus(status: VoiceConnectionStatus): void {
        this.status = status;
        this.emit("status", status);
    }
}
