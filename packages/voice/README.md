# @volundr/voice

Audio resource utilities for Volundr. Converts files, URLs, and streams into Opus frames for Discord voice playback.

## Install

```bash
npm install @volundr/voice
```

Requires FFmpeg on the system PATH (or `ffmpeg-static` as a dependency).

## Usage

```typescript
import { createAudioResource, StreamType } from "@volundr/voice";

// From file — FFmpeg transcodes automatically
const resource = createAudioResource("./song.mp3", { volume: 0.8 });
connection.getAudioPlayer()!.play(resource);

// From URL
const resource2 = createAudioResource("https://example.com/audio.ogg");

// Ogg/Opus stream — skip FFmpeg, just demux
const resource3 = createAudioResource(oggStream, { inputType: StreamType.OggOpus });

// Raw Opus frames — zero-copy pass-through
const resource4 = createAudioResource(opusStream, { inputType: StreamType.Opus });
```

## Pipeline

| Input | StreamType | Pipeline |
|-------|-----------|----------|
| `string` (path/URL) | — | FFmpeg -> OggDemuxer -> Opus |
| `Readable` | `Arbitrary` | stdin -> FFmpeg -> OggDemuxer -> Opus |
| `Readable` | `OggOpus` | OggDemuxer -> Opus |
| `Readable` | `Opus` | pass-through |

## Part of [Volundr](https://www.npmjs.com/org/volundr)

## License

ISC
