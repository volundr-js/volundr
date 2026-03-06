# @volundr/client

The main Volundr package. Everything you need to build a Discord bot: entities, declarative routing, cache, builders, collectors, and utilities.

## Install

```bash
npm install @volundr/client
```

## Quick Start

```typescript
import { Client, fmt, embed, row, button, SlashCommandBuilder } from "@volundr/client";
import { GatewayIntents, ButtonStyle } from "@volundr/types";

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

client.command("ping", async (i) => {
    const start = Date.now();
    await i.reply("Pinging...");
    await i.editReply(`Pong! ${Date.now() - start}ms`);
});

client.on("MESSAGE_CREATE", async (message) => {
    if (message.content === "!hello") {
        await message.reply(fmt`Hey ${message.author}!`);
    }
});

client.connect();
```

## Declarative Routing

No more `if/switch` chains inside `INTERACTION_CREATE`:

```typescript
// Slash commands
client.command("ping", handler);
client.command("config/channel/set", handler);  // subcommand routing

// Components
client.button("confirm", handler);
client.button(/^ticket-(\d+)$/, handler);       // RegExp matching
client.selectMenu("color", handler);

// Modals & autocomplete
client.modal("feedback", handler);
client.autocomplete("search", handler);

// Context menus
client.contextMenu("Get User Info", handler);
```

## Features

- Rich entity classes — `User`, `Guild`, `Message`, `Channel`, `GuildMember`, `Role`, etc.
- `fmt` tagged template — auto-resolves entities to Discord mentions
- `embed()`, `row()`, `button()` — functional component helpers
- `SlashCommandBuilder`, `EmbedBuilder`, `ModalBuilder` — fluent builders
- `Collection` — extended Map with 25+ utility methods
- Collectors — `MessageCollector`, `ComponentCollector`, `ReactionCollector`
- Event streaming — `client.stream("EVENT")` async generator
- Cache sweepers — automatic memory management
- `Symbol.asyncDispose` support

## Part of [Volundr](https://www.npmjs.com/org/volundr)

This package re-exports types from `@volundr/types` and `@volundr/gateway`, so most bots only need this single dependency.

## License

ISC
