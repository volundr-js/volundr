import WebSocket from "ws";
import { Logger } from "@volundr/logger";
import { TypedEmitter } from "@volundr/types";

const log = Logger.getLogger("gateway", "VoiceWS");

export enum VoiceOpcodes {
    Identify = 0,
    SelectProtocol = 1,
    Ready = 2,
    Heartbeat = 3,
    SessionDescription = 4,
    Speaking = 5,
    HeartbeatAck = 6,
    Resume = 7,
    Hello = 8,
    Resumed = 9,
    ClientsConnect = 11,
    ClientDisconnect = 13,
    // DAVE JSON opcodes
    DavePrepareTransition = 21,
    DaveExecuteTransition = 22,
    DaveTransitionReady = 23,
    DavePrepareEpoch = 24,
    // DAVE binary opcodes
    MlsExternalSender = 25,
    MlsKeyPackage = 26,
    MlsProposals = 27,
    MlsCommitWelcome = 28,
    MlsAnnounceCommitTransition = 29,
    MlsWelcome = 30,
    MlsInvalidCommitWelcome = 31,
}

export interface VoiceReadyData {
    ssrc: number;
    ip: string;
    port: number;
    modes: string[];
    dave_protocol_version?: number;
}

export interface VoiceSessionDescriptionData {
    mode: string;
    secret_key: number[];
    dave_protocol_version?: number;
}

export interface VoiceSpeakingData {
    user_id: string;
    ssrc: number;
    speaking: number;
}

export interface DavePrepareTransitionData {
    transition_id: number;
    protocol_version: number;
}

export interface DaveExecuteTransitionData {
    transition_id: number;
}

export interface DavePrepareEpochData {
    epoch: number;
    protocol_version: number;
}

export interface VoiceConnectInfo {
    endpoint: string;
    serverId: string;
    userId: string;
    sessionId: string;
    token: string;
}

export interface VoiceWebSocketEvents {
    ready: VoiceReadyData;
    sessionDescription: VoiceSessionDescriptionData;
    speaking: VoiceSpeakingData;
    clientsConnect: string[];
    clientDisconnect: string;
    davePrepareTransition: DavePrepareTransitionData;
    daveExecuteTransition: DaveExecuteTransitionData;
    davePrepareEpoch: DavePrepareEpochData;
    mlsExternalSender: Buffer;
    mlsProposals: Buffer;
    mlsAnnounceCommitTransition: Buffer;
    mlsWelcome: Buffer;
    close: number;
    error: Error;
}

export class VoiceWebSocket extends TypedEmitter<VoiceWebSocketEvents> {
    private ws: WebSocket | null = null;
    private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
    private heartbeatJitterTimer: ReturnType<typeof setTimeout> | null = null;
    private seq: number = -1;

    connect(info: VoiceConnectInfo): void {
        const url = `wss://${info.endpoint}?v=8`;
        log.info(`Connecting to voice server: ${info.endpoint} (v8)`);

        this.ws = new WebSocket(url);

        this.ws.on("open", () => {
            log.debug("Voice WebSocket open");
        });

        this.ws.on("message", (raw: WebSocket.RawData, isBinary: boolean) => {
            if (isBinary) {
                this.onBinaryMessage(Buffer.from(raw as ArrayBuffer));
            } else {
                const payload = JSON.parse(raw.toString()) as { op: number; d: unknown; seq?: number };
                this.onMessage(payload, info);
            }
        });

        this.ws.on("close", (code: number) => {
            log.warn(`Voice WebSocket closed (code=${code})`);
            this.stopHeartbeat();
            this.emit("close", code);
        });

        this.ws.on("error", (err: Error) => {
            log.error(`Voice WebSocket error: ${err.message}`);
            this.emit("error", err);
        });
    }

    disconnect(): void {
        this.stopHeartbeat();
        this.seq = -1;

        if (this.ws) {
            this.ws.removeAllListeners();
            if (this.ws.readyState === WebSocket.OPEN) {
                this.ws.close(1000);
            }
            this.ws = null;
        }

        log.info("Voice WebSocket disconnected");
    }

    private onBinaryMessage(data: Buffer): void {
        if (data.length < 3) return;

        // Binary format: [uint16 seq][uint8 opcode][payload...]
        const seq = data.readUInt16BE(0);
        if (seq > this.seq) this.seq = seq;
        const opcode = data.readUInt8(2);
        const payload = data.subarray(3);
        log.debug(`Binary recv: seq=${seq} op=${opcode} len=${payload.length}`);

        switch (opcode) {
            case VoiceOpcodes.MlsExternalSender:
                log.debug("Received MLS_EXTERNAL_SENDER");
                this.emit("mlsExternalSender", payload);
                break;

            case VoiceOpcodes.MlsProposals:
                log.debug("Received MLS_PROPOSALS");
                this.emit("mlsProposals", payload);
                break;

            case VoiceOpcodes.MlsAnnounceCommitTransition:
                log.debug("Received MLS_ANNOUNCE_COMMIT_TRANSITION");
                this.emit("mlsAnnounceCommitTransition", payload);
                break;

            case VoiceOpcodes.MlsWelcome:
                log.debug("Received MLS_WELCOME");
                this.emit("mlsWelcome", payload);
                break;

            default:
                log.debug(`Unknown binary opcode: ${opcode}`);
        }
    }

    private onMessage(payload: { op: number; d: unknown; seq?: number }, info: VoiceConnectInfo): void {
        if (payload.seq !== undefined && payload.seq !== null) {
            this.seq = payload.seq;
        }
        log.debug(`JSON recv: op=${payload.op} seq=${payload.seq ?? "none"}`);
        switch (payload.op) {
            case VoiceOpcodes.Hello:
                this.onHello(payload.d as { heartbeat_interval: number }, info);
                break;

            case VoiceOpcodes.Ready:
                log.info("Voice ready");
                this.emit("ready", payload.d as VoiceReadyData);
                break;

            case VoiceOpcodes.SessionDescription:
                this.emit("sessionDescription", payload.d as VoiceSessionDescriptionData);
                break;

            case VoiceOpcodes.Speaking:
                this.emit("speaking", payload.d as VoiceSpeakingData);
                break;

            case VoiceOpcodes.HeartbeatAck:
                log.info(`Voice heartbeat ACK (nonce=${JSON.stringify(payload.d)})`);
                break;

            case VoiceOpcodes.ClientsConnect: {
                const data = payload.d as { user_ids: string[] };
                log.debug(`Clients connected: ${data.user_ids.join(", ")}`);
                this.emit("clientsConnect", data.user_ids);
                break;
            }

            case VoiceOpcodes.ClientDisconnect: {
                const data = payload.d as { user_id: string };
                log.debug(`Client disconnected: ${data.user_id}`);
                this.emit("clientDisconnect", data.user_id);
                break;
            }

            case VoiceOpcodes.DavePrepareTransition:
                log.info(`DAVE_PREPARE_TRANSITION: ${JSON.stringify(payload.d)}`);
                this.emit("davePrepareTransition", payload.d as DavePrepareTransitionData);
                break;

            case VoiceOpcodes.DaveExecuteTransition:
                log.info(`DAVE_EXECUTE_TRANSITION: ${JSON.stringify(payload.d)}`);
                this.emit("daveExecuteTransition", payload.d as DaveExecuteTransitionData);
                break;

            case VoiceOpcodes.DavePrepareEpoch:
                log.info(`DAVE_PREPARE_EPOCH: ${JSON.stringify(payload.d)}`);
                this.emit("davePrepareEpoch", payload.d as DavePrepareEpochData);
                break;

            default:
                log.info(`Unhandled voice opcode: ${payload.op} d=${JSON.stringify(payload.d)}`);
        }
    }

    private onHello(data: { heartbeat_interval: number }, info: VoiceConnectInfo): void {
        log.info(`Voice Hello (heartbeat_interval=${data.heartbeat_interval}ms)`);
        this.identify(info);
        this.startHeartbeat(data.heartbeat_interval);
    }

    private identify(info: VoiceConnectInfo): void {
        log.info("Sending voice IDENTIFY (with DAVE support)");
        this.send(VoiceOpcodes.Identify, {
            server_id: info.serverId,
            user_id: info.userId,
            session_id: info.sessionId,
            token: info.token,
            max_dave_protocol_version: 1,
        });
    }

    private startHeartbeat(interval: number): void {
        this.stopHeartbeat();

        const sendHeartbeat = () => {
            const nonce = Date.now();
            log.debug(`Sending voice heartbeat (nonce=${nonce}, seq_ack=${this.seq})`);
            this.send(VoiceOpcodes.Heartbeat, { t: nonce, seq_ack: this.seq });
        };

        const jitter = Math.random();
        this.heartbeatJitterTimer = setTimeout(() => {
            sendHeartbeat();
            this.heartbeatInterval = setInterval(sendHeartbeat, interval);
        }, interval * jitter);
    }

    private stopHeartbeat(): void {
        if (this.heartbeatJitterTimer) {
            clearTimeout(this.heartbeatJitterTimer);
            this.heartbeatJitterTimer = null;
        }
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }

    sendSelectProtocol(address: string, port: number, mode: string): void {
        log.info(`Sending SELECT_PROTOCOL (mode=${mode}, address=${address}:${port})`);
        this.send(VoiceOpcodes.SelectProtocol, {
            protocol: "udp",
            data: {
                address,
                port,
                mode,
            },
        });
    }

    sendSpeaking(speaking: number, ssrc: number): void {
        this.send(VoiceOpcodes.Speaking, {
            speaking,
            delay: 0,
            ssrc,
        });
    }

    sendDaveTransitionReady(transitionId: number): void {
        log.info(`Sending DAVE_TRANSITION_READY (transition_id=${transitionId})`);
        this.send(VoiceOpcodes.DaveTransitionReady, { transition_id: transitionId });
    }

    sendMlsInvalidCommitWelcome(transitionId: number): void {
        log.warn(`Sending MLS_INVALID_COMMIT_WELCOME (transition_id=${transitionId})`);
        this.send(VoiceOpcodes.MlsInvalidCommitWelcome, { transition_id: transitionId });
    }

    sendBinary(opcode: number, payload: Buffer): void {
        if (this.ws?.readyState !== WebSocket.OPEN) return;

        // Client-to-server binary format: [uint8 opcode][payload...]
        // (NO sequence number - seq is server-to-client only)
        log.debug(`Binary send: op=${opcode} len=${payload.length}`);

        const message = Buffer.concat([new Uint8Array([opcode]), payload]);
        this.ws.send(message);
    }

    sendMlsKeyPackage(keyPackage: Buffer): void {
        log.debug("Sending MLS_KEY_PACKAGE");
        this.sendBinary(VoiceOpcodes.MlsKeyPackage, keyPackage);
    }

    sendMlsCommitWelcome(commit: Buffer, welcome?: Buffer): void {
        log.debug("Sending MLS_COMMIT_WELCOME");
        const payload = welcome ? Buffer.concat([commit, welcome]) : commit;
        this.sendBinary(VoiceOpcodes.MlsCommitWelcome, payload);
    }

    private send(op: VoiceOpcodes, d: unknown): void {
        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ op, d }));
        }
    }
}
