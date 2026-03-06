# @volundr/types

TypeScript type definitions for the Discord API, used across all Volundr packages.

## Install

```bash
npm install @volundr/types
```

## Usage

```typescript
import { GatewayIntents, ChannelType, ButtonStyle, ApplicationCommandType } from "@volundr/types";
import type { APIMessage, APIUser, APIGuild, APIChannel } from "@volundr/types";
```

## What's included

- Gateway types — intents, opcodes, events, payloads
- REST types — all API object shapes (`APIMessage`, `APIUser`, `APIGuild`, etc.)
- Interaction types — commands, components, modals, autocomplete
- Component types — buttons, select menus, text inputs, action rows
- Enums — `ChannelType`, `ButtonStyle`, `ApplicationCommandType`, `PermissionFlags`, etc.
- Voice types — opcodes, encryption modes, speaking flags
- Utility types — `Snowflake`, `ISO8601Timestamp`, `Locale`

## Part of [Volundr](https://www.npmjs.com/org/volundr)

Most bots only need `@volundr/client`. This package is for advanced use or building custom integrations.

## License

ISC
