export { Gateway } from "./Gateway.js";
export { ShardManager } from "./shard/index.js";
export { GatewayIntents, GATEWAY_VERSION } from "./constants.js";
export { GatewayOpcodes } from "./types.js";
export type {
    GatewayOptions,
    GatewayPayload,
    GatewayStatus,
    GatewayInternalEvents,
    GatewayPresence,
    GatewayActivity,
    GatewayBotData,
} from "./types.js";
export type { ShardManagerOptions, ShardManagerEvents } from "./shard/index.js";

// Voice
export { VoiceWebSocket, VoiceOpcodes, VoiceConnection, VoiceUDP, AudioPlayer, OggDemuxer, encryptOpusFrame } from "./voice/index.js";
export type {
    VoiceReadyData,
    VoiceSessionDescriptionData,
    VoiceSpeakingData,
    VoiceWebSocketEvents,
    VoiceConnectInfo,
    VoiceConnectionStatus,
    VoiceConnectionEvents,
    VoiceUDPEvents,
    AudioPlayerStatus,
    AudioPlayerEvents,
} from "./voice/index.js";
