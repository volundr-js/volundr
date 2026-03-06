/**
 * Describes the type of an audio stream provided to createAudioResource.
 */
export enum StreamType {
    /** Raw Opus frames - no processing needed (zero-copy pass-through). */
    Opus = "opus",

    /** Ogg/Opus container - will be demuxed via OggDemuxer (skips FFmpeg). */
    OggOpus = "ogg/opus",

    /** Unknown/arbitrary format - will be transcoded via FFmpeg to Ogg/Opus. */
    Arbitrary = "arbitrary",
}
