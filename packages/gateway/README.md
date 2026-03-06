# @volundr/gateway

Discord Gateway v10 WebSocket client with sharding, voice connections, and DAVE E2EE support.

## Install

```bash
npm install @volundr/gateway
```

## Usage

```typescript
import { Gateway } from "@volundr/gateway";
import { GatewayIntents } from "@volundr/types";

const gw = new Gateway({
    token: process.env.DISCORD_TOKEN!,
    intents: GatewayIntents.Guilds | GatewayIntents.GuildMessages,
});

gw.on("READY", (data) => {
    console.log(`Connected as ${data.user.username}`);
});

gw.on("MESSAGE_CREATE", (data) => {
    console.log(`${data.author.username}: ${data.content}`);
});

await gw.connect();
```

## Features

- Gateway v10 with ETF/JSON encoding
- Automatic reconnection and session resuming
- Heartbeat management
- Worker thread sharding via `ShardManager`
- Voice connections with UDP, encryption, and DAVE E2EE
- Native audio player (Opus frames at 20ms intervals)
- OggDemuxer transform stream

## Voice

```typescript
const connection = gw.joinVoice(guildId, channelId, { selfDeaf: true });

connection.on("ready", () => {
    const player = connection.getAudioPlayer()!;
    player.play(opusStream);
});
```

## Part of [Volundr](https://www.npmjs.com/org/volundr)

Most bots should use `@volundr/client` which wraps this with entities, cache, and routing.

## License

ISC
