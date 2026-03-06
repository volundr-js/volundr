<p align="center">
  <h1 align="center">Völundr</h1>
  <p align="center">A Discord SDK for TypeScript. Fast, predictable, zero magic.</p>
</p>

<p align="center">
  <a href="https://www.npmjs.com/org/volundr"><img src="https://img.shields.io/npm/v/@volundr/client?label=%40volundr%2Fclient&color=5865F2" alt="npm"></a>
  <a href="#packages"><img src="https://img.shields.io/badge/packages-8-brightgreen" alt="packages"></a>
  <a href="#license"><img src="https://img.shields.io/badge/license-ISC-blue" alt="license"></a>
</p>

<p align="center">
  <a href="#quick-start">Quick Start</a> •
  <a href="#why-völundr">Why Völundr?</a> •
  <a href="#examples">Examples</a> •
  <a href="#voice--music">Voice & Music</a> •
  <a href="#packages">Packages</a>
</p>

---

## Quick Start

```
Node.js 18+  •  Discord API v10  •  TypeScript 5+
```

```bash
npm install @volundr/client
```

```typescript
import { Client, fmt, SlashCommandBuilder } from "@volundr/client";
import { GatewayIntents } from "@volundr/types";

const client = new Client({
    token: process.env.DISCORD_TOKEN!,
    intents: GatewayIntents.Guilds | GatewayIntents.GuildMessages | GatewayIntents.MessageContent,
});

client.once("ready", async () => {
    console.log(`Online as ${client.user!.tag}`);
    await client.setGlobalCommands([
        new SlashCommandBuilder().setName("ping").setDescription("Pong!").toJSON(),
    ]);
});

// Declarative command routing — no if/switch chains
client.command("ping", async (i) => {
    await i.reply("Pong!");
});

// Prefix commands with rich entity objects
client.on("MESSAGE_CREATE", async (message) => {
    if (message.content === "!hello") {
        await message.reply(fmt`Hey ${message.author}!`);
    }
});

client.connect();
```

That's it. No boilerplate, no magic, no 47 imports.

---

## Why Völundr?

**Predictable API.** `.get()` reads from cache. `.fetch()` calls the API. `.send()` accepts the same input everywhere.

**Declarative routing.** `client.command("ping", handler)` instead of giant `if/switch` chains inside `INTERACTION_CREATE`. Same for buttons, select menus, modals, and autocomplete.

**Fast where it matters.** 500k+ events/sec. Sub-microsecond latency. 2.4x less GC garbage than Node.js EventEmitter.

**Scales.** Cache sweepers, configurable limits, worker thread sharding, global rate limit coordination.

```
Discord API
     │
  Gateway ──→ events (WebSocket, shards, voice)
  REST    ──→ requests (rate limits, retries, buckets)
     │
  Client  ──→ entities + cache + routing + builders
     │
  Your bot
```

---

## Examples

### Slash commands

```typescript
import { Client, SlashCommandBuilder, embed, row, button } from "@volundr/client";
import { GatewayIntents, ButtonStyle } from "@volundr/types";

// Declarative routing — each command gets its own handler
client.command("userinfo", async (i) => {
    const user = i.options.getUser("user", i.client) ?? i.user;

    await i.reply({
        embeds: [embed({
            title: user.displayName,
            thumbnail: user.displayAvatarURL(),
            fields: [
                { name: "ID", value: user.id, inline: true },
                { name: "Created", value: user.createdAt.toDateString(), inline: true },
            ],
            color: 0x5865F2,
        })],
        components: [row(button("refresh", "Refresh", ButtonStyle.Primary))],
    });
});

// Subcommand routing — use "/" syntax
client.command("config/channel/set", async (i) => {
    const channel = i.options.getChannel("channel", i.client, true);
    await i.reply(`Set to ${channel}`);
});
```

### Buttons, select menus, modals

```typescript
// Each component gets its own handler by customId
client.button("refresh", async (i) => {
    await i.update(fmt`Refreshed by ${i.user}!`);
});

// RegExp matching for dynamic IDs
client.button(/^ticket-(\d+)$/, async (i) => {
    const ticketId = i.customId.match(/^ticket-(\d+)$/)![1];
    await i.reply(`Ticket #${ticketId}`);
});

client.selectMenu("color", async (i) => {
    await i.reply(`You chose: ${i.values.join(", ")}`);
});

client.modal("feedback", async (i) => {
    const message = i.fields.getTextInputValue("message");
    await i.reply(`Thanks: ${message}`);
});

client.autocomplete("search", async (i) => {
    const query = i.options.getFocused();
    await i.respond([{ name: query, value: query }]);
});
```

### Tagged template mentions

```typescript
import { fmt } from "@volundr/client";

// fmt auto-resolves entities to Discord mentions
await channel.send(fmt`Welcome ${user} to ${channel}!`);
// → "Welcome <@123456> to <#789012>!"
```

### Event streaming

```typescript
// AsyncGenerator-based event consumption
for await (const message of client.stream("MESSAGE_CREATE")) {
    if (message.content === "stop") break;
    console.log(message.content);
}

// With AbortSignal
const ac = new AbortController();
setTimeout(() => ac.abort(), 30_000);

for await (const msg of client.stream("MESSAGE_CREATE", { signal: ac.signal })) {
    console.log(msg.content);
}
```

### Collectors

```typescript
// Wait for button clicks (30s timeout)
const clicks = await message.awaitComponents({ time: 30_000, max: 1 });

// Auto-cleanup with `using`
using collector = channel.createMessageCollector({
    filter: (msg) => msg.author.id === userId,
    time: 30_000,
});
// collector is automatically stopped when scope exits
```

---

## Voice & Music

### Native voice

```typescript
const connection = client.joinVoiceChannel(guildId, channelId, { selfDeaf: true });
```

### Play audio

```typescript
import { createAudioResource, StreamType } from "@volundr/voice";

// File — FFmpeg transcodes automatically
const resource = createAudioResource("./song.mp3", { volume: 0.8 });
connection.getAudioPlayer()!.play(resource);

// Ogg stream — skip FFmpeg
const resource2 = createAudioResource(oggStream, { inputType: StreamType.OggOpus });

// Raw Opus — zero-copy pass-through
const resource3 = createAudioResource(opusStream, { inputType: StreamType.Opus });
```

### Lavalink

```typescript
import { LavalinkManager } from "@volundr/lavalink";

const lavalink = new LavalinkManager(client, {
    nodes: [{ host: "localhost", port: 2333, password: "youshallnotpass" }],
});

await lavalink.connect();

const result = await lavalink.search("never gonna give you up");
const player = lavalink.getPlayer(guildId);
await player.play(result.tracks[0]);
```

---

## Packages

| Package | What it does |
|---------|-------------|
| [`@volundr/client`](https://www.npmjs.com/package/@volundr/client) | Everything you need — entities, routing, cache, builders, collectors |
| [`@volundr/gateway`](https://www.npmjs.com/package/@volundr/gateway) | Gateway v10 — WebSocket, sharding, voice connections |
| [`@volundr/rest`](https://www.npmjs.com/package/@volundr/rest) | REST API — rate limits, retries, file uploads |
| [`@volundr/voice`](https://www.npmjs.com/package/@volundr/voice) | Audio playback — FFmpeg, Opus, AudioResource |
| [`@volundr/lavalink`](https://www.npmjs.com/package/@volundr/lavalink) | Lavalink v4 — search, play, filters, events |
| [`@volundr/types`](https://www.npmjs.com/package/@volundr/types) | TypeScript types for the Discord API |
| [`@volundr/threads`](https://www.npmjs.com/package/@volundr/threads) | Worker thread pool for multi-core sharding |
| [`@volundr/logger`](https://www.npmjs.com/package/@volundr/logger) | Structured logging |

Most bots only need `@volundr/client`. Everything else is optional.

---

## Design Philosophy

1. **`.get()` = cache, `.fetch()` = API.** Always. Everywhere. No exceptions.
2. **Declarative routing.** `client.command()`, `client.button()`, `client.modal()` — no if/switch chains.
3. **No hidden state.** Cache is explicit. Gateway and REST are separate. Use them independently.
4. **Entities are thin.** Properties from Discord, methods that call REST. No 20 layers between you and the API.
5. **Opt-in complexity.** Need just the WebSocket? `@volundr/gateway`. Just HTTP? `@volundr/rest`.

---

## License

ISC
