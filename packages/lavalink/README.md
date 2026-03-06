# @volundr/lavalink

Lavalink v4 client for Volundr. Search, play, queue, and control audio via Lavalink nodes.

## Install

```bash
npm install @volundr/lavalink
```

## Usage

```typescript
import { Client } from "@volundr/client";
import { LavalinkManager } from "@volundr/lavalink";

const client = new Client({ token: "...", intents: ... });

const lavalink = new LavalinkManager(client, {
    nodes: [{ host: "localhost", port: 2333, password: "youshallnotpass" }],
});

client.once("ready", async () => {
    await lavalink.connect();
});

// Search and play
client.command("play", async (i) => {
    const query = i.options.getString("query", true);
    const result = await lavalink.search(query);

    if (!result.tracks.length) {
        return i.reply("Nothing found.");
    }

    const player = lavalink.getPlayer(i.guildId!);
    await player.play(result.tracks[0]);
    await i.reply(`Playing: ${result.tracks[0].info.title}`);
});

client.connect();
```

## Features

- Multi-node support with automatic failover
- Track search (YouTube, SoundCloud, URLs, etc.)
- Player controls — play, pause, stop, seek, volume, filters
- Event handling — track start/end/stuck/exception
- Session resuming
- Voice state management (automatic)

## Part of [Volundr](https://www.npmjs.com/org/volundr)

## License

ISC
