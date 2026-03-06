import { DAVESession, DAVE_PROTOCOL_VERSION, ProposalsOperationType } from "@snazzah/davey";
import { Logger } from "@volundr/logger";
import { VoiceWebSocket, VoiceOpcodes } from "./VoiceWebSocket.js";

const log = Logger.getLogger("gateway", "DAVE");

export class DAVEManager {
    private session: DAVESession | null = null;
    private protocolVersion = 0;
    private connectedUserIds = new Set<string>();
    private pendingTransitions = new Map<number, number>();
    private readyCallback: (() => void) | null = null;
    private _ready = false;

    /** Stored listener references for cleanup in destroy(). */
    private readonly _listeners: [string, (...args: any[]) => void][];

    constructor(
        private readonly userId: string,
        private readonly channelId: string,
        private readonly voiceWs: VoiceWebSocket,
    ) {
        // Track connected users immediately - clientsConnect can arrive before init()
        this.connectedUserIds.add(userId);

        const onClientsConnect = (userIds: string[]) => {
            for (const id of userIds) this.connectedUserIds.add(id);
            log.debug(`Connected users: [${Array.from(this.connectedUserIds).join(", ")}]`);
        };
        const onClientDisconnect = (uid: string) => { this.connectedUserIds.delete(uid); };
        const onExternalSender = (payload: Buffer) => this.handleExternalSender(payload);
        const onProposals = (payload: Buffer) => this.handleProposals(payload);
        const onCommitTransition = (payload: Buffer) => this.handleCommitTransition(payload);
        const onWelcome = (payload: Buffer) => this.handleWelcome(payload);
        const onPrepareTransition = (data: { transition_id: number; protocol_version: number }) =>
            this.handlePrepareTransition(data.transition_id, data.protocol_version);
        const onExecuteTransition = (data: { transition_id: number }) =>
            this.handleExecuteTransition(data.transition_id);
        const onPrepareEpoch = (data: { epoch: number; protocol_version: number }) =>
            this.handlePrepareEpoch(data.epoch, data.protocol_version);

        this._listeners = [
            ["clientsConnect", onClientsConnect],
            ["clientDisconnect", onClientDisconnect],
            ["mlsExternalSender", onExternalSender],
            ["mlsProposals", onProposals],
            ["mlsAnnounceCommitTransition", onCommitTransition],
            ["mlsWelcome", onWelcome],
            ["davePrepareTransition", onPrepareTransition],
            ["daveExecuteTransition", onExecuteTransition],
            ["davePrepareEpoch", onPrepareEpoch],
        ];

        for (const [event, fn] of this._listeners) {
            this.voiceWs.on(event, fn);
        }
    }

    /** Register a callback for when DAVE handshake completes */
    onReady(cb: () => void): void {
        this.readyCallback = cb;
        // If already ready (e.g. no DAVE), fire immediately
        if (this._ready) cb();
    }

    /** Initialize after SESSION_DESCRIPTION provides the negotiated dave_protocol_version */
    init(daveProtocolVersion: number): void {
        this.protocolVersion = daveProtocolVersion;

        if (daveProtocolVersion === 0) {
            log.info("DAVE not negotiated (protocol_version=0), skipping");
            this._ready = true;
            this.readyCallback?.();
            return;
        }

        log.info(`Initializing DAVE session (protocol_version=${daveProtocolVersion})`);
        log.debug(`Known users at init: [${Array.from(this.connectedUserIds).join(", ")}]`);
        this.session = new DAVESession(daveProtocolVersion, this.userId, this.channelId);

        // Send initial key package
        this.voiceWs.sendMlsKeyPackage(this.session.getSerializedKeyPackage());
    }

    private signalReady(): void {
        if (this._ready) return;
        this._ready = true;
        log.info("DAVE handshake complete - session ready");
        this.readyCallback?.();
    }

    private handleExternalSender(payload: Buffer): void {
        if (!this.session) return;

        try {
            this.session.setExternalSender(payload);
            log.info("External sender set successfully");
        } catch (err) {
            log.error(`Failed to set external sender: ${(err as Error).message}`);
        }
    }

    private handleProposals(payload: Buffer): void {
        if (!this.session) return;

        try {
            // First byte of payload is the operation type (APPEND=0 or REVOKE=1)
            const opType = payload.readUInt8(0) as ProposalsOperationType;
            const proposals = payload.subarray(1);
            const users = Array.from(this.connectedUserIds);

            log.debug(`processProposals: opType=${opType} proposalsLen=${proposals.length} users=${users.length}`);

            const result = this.session.processProposals(
                opType,
                proposals,
                users,
            );

            log.debug(`proposals result: commit=${result.commit?.length ?? "none"} welcome=${result.welcome?.length ?? "none"} epoch=${this.session.epoch}`);

            if (result.commit) {
                this.voiceWs.sendMlsCommitWelcome(result.commit, result.welcome ?? undefined);
                log.info("Sent MLS commit/welcome after proposals");
            }
        } catch (err) {
            log.error(`Failed to process proposals: ${(err as Error).message}`);
            this.reinitSession();
        }
    }

    private handleCommitTransition(payload: Buffer): void {
        if (!this.session) return;

        // Payload: [uint16 transition_id][commit data...]
        const transitionId = payload.readUInt16BE(0);
        const commitData = payload.subarray(2);

        try {
            this.session.processCommit(commitData);
            log.info(`Processed commit (transition_id=${transitionId}, epoch=${this.session.epoch}, ready=${this.session.ready})`);

            if (transitionId !== 0) {
                this.pendingTransitions.set(transitionId, this.protocolVersion);
                this.voiceWs.sendDaveTransitionReady(transitionId);
            }

            if (this.session.ready) this.signalReady();
        } catch (err) {
            log.error(`Invalid commit (transition_id=${transitionId}): ${(err as Error).message}`);
            this.voiceWs.sendMlsInvalidCommitWelcome(transitionId);
            this.reinitSession();
        }
    }

    private handleWelcome(payload: Buffer): void {
        if (!this.session) return;

        // Payload: [uint16 transition_id][welcome data...]
        const transitionId = payload.readUInt16BE(0);
        const welcomeData = payload.subarray(2);

        try {
            this.session.processWelcome(welcomeData);
            log.info(`Processed welcome (transition_id=${transitionId}, epoch=${this.session.epoch}, ready=${this.session.ready})`);

            if (transitionId !== 0) {
                this.pendingTransitions.set(transitionId, this.protocolVersion);
                this.voiceWs.sendDaveTransitionReady(transitionId);
            }

            if (this.session.ready) this.signalReady();
        } catch (err) {
            log.error(`Invalid welcome (transition_id=${transitionId}): ${(err as Error).message}`);
            this.voiceWs.sendMlsInvalidCommitWelcome(transitionId);
            this.reinitSession();
        }
    }

    private handlePrepareTransition(transitionId: number, protocolVersion: number): void {
        log.info(`Prepare transition: id=${transitionId}, protocol=${protocolVersion}`);

        if (transitionId === 0) {
            // Transition ID 0 = reinitialize immediately
            if (protocolVersion === 0) {
                // Downgrade to no DAVE
                this.session?.setPassthroughMode(true, 10);
                this.protocolVersion = 0;
            }
            return;
        }

        if (protocolVersion === 0 && this.session) {
            // Pending downgrade - enable passthrough with longer expiry
            this.session.setPassthroughMode(true, 24);
        }

        this.pendingTransitions.set(transitionId, protocolVersion);
        this.voiceWs.sendDaveTransitionReady(transitionId);
    }

    private handleExecuteTransition(transitionId: number): void {
        const protocolVersion = this.pendingTransitions.get(transitionId);
        this.pendingTransitions.delete(transitionId);

        if (protocolVersion === undefined) {
            log.warn(`Unknown transition_id=${transitionId}`);
            return;
        }

        log.info(`Execute transition: id=${transitionId}, protocol=${protocolVersion}`);
        this.protocolVersion = protocolVersion;

        if (protocolVersion === 0) {
            // Downgrade complete
            this.session?.setPassthroughMode(true);
        } else if (this.session) {
            // Upgrade: disable passthrough with 10s expiry for late unencrypted packets
            this.session.setPassthroughMode(false, 10);
        }
    }

    private handlePrepareEpoch(epoch: number, protocolVersion: number): void {
        log.info(`Prepare epoch: epoch=${epoch}, protocol=${protocolVersion}`);

        if (epoch === 1) {
            // New MLS group - reinitialize
            this.protocolVersion = protocolVersion;
            this.reinitSession();
        }
    }

    private reinitSession(): void {
        if (!this.session) return;

        log.info("Reinitializing DAVE session");
        this.session.reinit(
            this.protocolVersion || DAVE_PROTOCOL_VERSION,
            this.userId,
            this.channelId,
        );
        this.voiceWs.sendMlsKeyPackage(this.session.getSerializedKeyPackage());
    }

    /** Encrypt an Opus frame with DAVE. Returns the original frame if DAVE is not active. */
    encryptOpus(frame: Buffer): Buffer {
        if (!this.session?.ready) return frame;

        try {
            return this.session.encryptOpus(frame);
        } catch (err) {
            log.error(`DAVE encrypt failed: ${(err as Error).message}`);
            return frame;
        }
    }

    /** Whether DAVE encryption is active */
    get isActive(): boolean {
        return this.session?.ready === true && this.protocolVersion > 0;
    }

    destroy(): void {
        // Remove all listeners from voiceWs to prevent memory leaks
        for (const [event, fn] of this._listeners) {
            this.voiceWs.off(event, fn);
        }
        this.session?.reset();
        this.session = null;
        this.connectedUserIds.clear();
        this.pendingTransitions.clear();
        this.protocolVersion = 0;
    }
}
