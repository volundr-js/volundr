import type { Snowflake } from "@volundr/types";

// --- Configuration ---

export interface LavalinkNodeOptions {
    /** Display name for this node */
    name: string;
    /** Lavalink server host (e.g., "localhost") */
    host: string;
    /** Lavalink server port (default: 2333) */
    port: number;
    /** Lavalink password (Authorization header) */
    password: string;
    /** Use TLS for WebSocket (wss://) and REST (https://) */
    secure?: boolean;
    /** Session ID for resuming a previous session */
    sessionId?: string;
    /** Timeout in ms for session resuming (default: 60000) */
    resumeTimeout?: number;
}

export interface LavalinkManagerOptions {
    /** Lavalink node configurations */
    nodes: LavalinkNodeOptions[];
    /** Bot user ID (auto-resolved from client if not provided) */
    userId?: Snowflake;
    /** Client name sent in Client-Name header */
    clientName?: string;
    /** Strategy for selecting nodes */
    nodeSelector?: NodeSelectorStrategy;
    /** Automatically destroy the player when the bot is disconnected from voice (default: true) */
    autoDestroyOnDisconnect?: boolean;
}

export type NodeSelectorStrategy = "round-robin" | "least-players" | "least-load";

// --- WebSocket Incoming Messages (from Lavalink server) ---

export interface LavalinkReadyPayload {
    op: "ready";
    resumed: boolean;
    sessionId: string;
}

export interface LavalinkPlayerUpdatePayload {
    op: "playerUpdate";
    guildId: Snowflake;
    state: PlayerState;
}

export interface PlayerState {
    time: number;
    position: number;
    connected: boolean;
    ping: number;
}

export interface LavalinkStatsPayload {
    op: "stats";
    players: number;
    playingPlayers: number;
    uptime: number;
    memory: LavalinkMemory;
    cpu: LavalinkCpu;
    frameStats?: LavalinkFrameStats;
}

export interface LavalinkMemory {
    free: number;
    used: number;
    allocated: number;
    reservable: number;
}

export interface LavalinkCpu {
    cores: number;
    systemLoad: number;
    lavalinkLoad: number;
}

export interface LavalinkFrameStats {
    sent: number;
    nulled: number;
    deficit: number;
}

export interface LavalinkEventPayload {
    op: "event";
    guildId: Snowflake;
    type: LavalinkEventType;
}

export type LavalinkEventType =
    | "TrackStartEvent"
    | "TrackEndEvent"
    | "TrackExceptionEvent"
    | "TrackStuckEvent"
    | "WebSocketClosedEvent";

export interface TrackStartEvent extends LavalinkEventPayload {
    type: "TrackStartEvent";
    track: LavalinkTrack;
}

export interface TrackEndEvent extends LavalinkEventPayload {
    type: "TrackEndEvent";
    track: LavalinkTrack;
    reason: TrackEndReason;
}

export type TrackEndReason = "finished" | "loadFailed" | "stopped" | "replaced" | "cleanup";

export interface TrackExceptionEvent extends LavalinkEventPayload {
    type: "TrackExceptionEvent";
    track: LavalinkTrack;
    exception: LavalinkException;
}

export interface LavalinkException {
    message: string | null;
    severity: "common" | "suspicious" | "fault";
    cause: string;
}

export interface TrackStuckEvent extends LavalinkEventPayload {
    type: "TrackStuckEvent";
    track: LavalinkTrack;
    thresholdMs: number;
}

export interface WebSocketClosedEvent extends LavalinkEventPayload {
    type: "WebSocketClosedEvent";
    code: number;
    reason: string;
    byRemote: boolean;
}

export type LavalinkEvent =
    | TrackStartEvent
    | TrackEndEvent
    | TrackExceptionEvent
    | TrackStuckEvent
    | WebSocketClosedEvent;

export type LavalinkMessage =
    | LavalinkReadyPayload
    | LavalinkPlayerUpdatePayload
    | LavalinkStatsPayload
    | LavalinkEventPayload;

// --- REST API Types ---

export interface LavalinkTrack {
    encoded: string;
    info: TrackInfo;
    pluginInfo: Record<string, unknown>;
    userData: Record<string, unknown>;
}

export interface TrackInfo {
    identifier: string;
    isSeekable: boolean;
    author: string;
    length: number;
    isStream: boolean;
    position: number;
    title: string;
    uri: string | null;
    artworkUrl: string | null;
    isrc: string | null;
    sourceName: string;
}

export type LoadResultType = "track" | "playlist" | "search" | "empty" | "error";

export interface TrackLoadResult {
    loadType: "track";
    data: LavalinkTrack;
}

export interface PlaylistLoadResult {
    loadType: "playlist";
    data: {
        info: PlaylistInfo;
        pluginInfo: Record<string, unknown>;
        tracks: LavalinkTrack[];
    };
}

export interface SearchLoadResult {
    loadType: "search";
    data: LavalinkTrack[];
}

export interface EmptyLoadResult {
    loadType: "empty";
    data: Record<string, never>;
}

export interface ErrorLoadResult {
    loadType: "error";
    data: LavalinkException;
}

export type LoadResult =
    | TrackLoadResult
    | PlaylistLoadResult
    | SearchLoadResult
    | EmptyLoadResult
    | ErrorLoadResult;

export interface PlaylistInfo {
    name: string;
    selectedTrack: number;
}

// --- Player Update (REST PATCH body) ---

export interface UpdatePlayerOptions {
    /** Base64 encoded track to play, or null to stop */
    track?: { encoded: string | null; userData?: Record<string, unknown> };
    /** Track position in ms */
    position?: number;
    /** End time in ms */
    endTime?: number | null;
    /** Volume (0-1000, default 100) */
    volume?: number;
    /** Paused state */
    paused?: boolean;
    /** Audio filters */
    filters?: LavalinkFilters;
    /** Voice connection data */
    voice?: VoiceUpdateData;
}

export interface VoiceUpdateData {
    token: string;
    endpoint: string;
    sessionId: string;
    channelId: string;
}

// --- Filters ---

export interface LavalinkFilters {
    volume?: number;
    equalizer?: EqualizerBand[];
    karaoke?: KaraokeSettings | null;
    timescale?: TimescaleSettings | null;
    tremolo?: TremoloSettings | null;
    vibrato?: VibratoSettings | null;
    rotation?: RotationSettings | null;
    distortion?: DistortionSettings | null;
    channelMix?: ChannelMixSettings | null;
    lowPass?: LowPassSettings | null;
}

export interface EqualizerBand {
    band: number;
    gain: number;
}

export interface KaraokeSettings {
    level?: number;
    monoLevel?: number;
    filterBand?: number;
    filterWidth?: number;
}

export interface TimescaleSettings {
    speed?: number;
    pitch?: number;
    rate?: number;
}

export interface TremoloSettings {
    frequency?: number;
    depth?: number;
}

export interface VibratoSettings {
    frequency?: number;
    depth?: number;
}

export interface RotationSettings {
    rotationHz?: number;
}

export interface DistortionSettings {
    sinOffset?: number;
    sinScale?: number;
    cosOffset?: number;
    cosScale?: number;
    tanOffset?: number;
    tanScale?: number;
    offset?: number;
    scale?: number;
}

export interface ChannelMixSettings {
    leftToLeft?: number;
    leftToRight?: number;
    rightToLeft?: number;
    rightToRight?: number;
}

export interface LowPassSettings {
    smoothing?: number;
}

// --- REST Response: Player ---

export interface LavalinkPlayerData {
    guildId: Snowflake;
    track: LavalinkTrack | null;
    volume: number;
    paused: boolean;
    state: PlayerState;
    voice: VoiceUpdateData;
    filters: LavalinkFilters;
}

// --- REST Response: Lavalink Info ---

export interface LavalinkInfo {
    version: LavalinkVersion;
    buildTime: number;
    git: LavalinkGit;
    jvm: string;
    lavaplayer: string;
    sourceManagers: string[];
    filters: string[];
    plugins: LavalinkPlugin[];
}

export interface LavalinkVersion {
    semver: string;
    major: number;
    minor: number;
    patch: number;
    preRelease: string | null;
    build: string | null;
}

export interface LavalinkGit {
    branch: string;
    commit: string;
    commitTime: number;
}

export interface LavalinkPlugin {
    name: string;
    version: string;
}

// --- Node Status ---

export type LavalinkNodeStatus = "disconnected" | "connecting" | "connected" | "reconnecting";
