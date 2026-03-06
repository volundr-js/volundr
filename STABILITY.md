# API Stability

Volundr follows [Semantic Versioning](https://semver.org/).

## Current Status: `0.9.x` (Pre-Release)

The API is being stabilized for `1.0`. Breaking changes are rare and documented in the changelog.

## Stability Tiers

### Frozen (will not break without a major version bump)

These are the public-facing APIs that bots depend on directly.

| Area | Examples |
|------|----------|
| **Client lifecycle** | `new Client()`, `connect()`, `disconnect()`, `Symbol.asyncDispose` |
| **Event system** | `on()`, `off()`, `once()`, `waitFor()`, `stream()` |
| **Entities** | `Message`, `Guild`, `Channel`, `User`, `GuildMember`, `Role`, `Presence`, `VoiceState`, `Invite`, `Webhook`, `GuildEmoji` |
| **Interactions** | `BaseInteraction`, `ChatInputInteraction`, `ButtonInteraction`, `SelectMenuInteraction`, `ModalSubmitInteraction`, `AutocompleteInteraction`, `ContextMenuInteraction` |
| **Interaction routing** | `client.command()`, `client.button()`, `client.selectMenu()`, `client.modal()`, `client.autocomplete()`, `client.contextMenu()` |
| **Builders** | `EmbedBuilder`, `ActionRowBuilder`, `ButtonBuilder`, `*SelectBuilder`, `ModalBuilder`, `TextInputBuilder`, `SlashCommandBuilder`, `ContextMenuCommandBuilder` |
| **Functional helpers** | `embed()`, `field()`, `row()`, `button()`, `linkButton()`, `option()`, `fmt` |
| **Collection** | `Collection<K, V>` - all public methods |
| **Permissions** | `Permissions`, `PermissionFlags` |
| **Formatters** | `Formatters.*`, `fmt` tagged template |
| **Collectors** | `MessageCollector`, `ComponentCollector`, `ReactionCollector`, `Symbol.dispose` |
| **REST methods** | All 130+ typed methods on `Client` |

### Stable (unlikely to break, but may evolve)

| Area | Notes |
|------|-------|
| **Cache model** | `client.guilds`, `client.channels`, `client.users`, guild-scoped collections |
| **CDN** | `CDN` utility class |
| **Sweepers** | `SweeperConfig`, filter functions |
| **Paginator** | `paginate()`, `paginateAll()` |
| **OAuth2** | `OAuth2` utility class |
| **Voice connection** | `client.joinVoice()`, `VoiceConnection` |

### Internal (may change between minor versions)

| Area | Notes |
|------|-------|
| **CacheManager** | Internal cache wiring, `EntityFactory` |
| **Gateway internals** | Heartbeat, session resume, shard lifecycle |
| **REST internals** | Rate limit handling, request queue |
| **Voice internals** | UDP, RTP, DAVE encryption |
| **ThreadPool internals** | Worker message protocol |

## Deprecation Policy

- Deprecated APIs are marked with `@deprecated` JSDoc and emit a console warning on first use.
- Deprecated APIs are removed in the next **major** version (never in a minor/patch).
- The `CacheStore` → `Collection` rename is the only current deprecation.

## Path to 1.0

- [x] Entity system (rich objects with methods)
- [x] Interaction routing (command/button/selectMenu/modal)
- [x] Idiomatic TypeScript (asyncDispose, type predicates, tagged templates)
- [x] Voice support (gateway + FFmpeg pipeline)
- [x] 480+ tests passing
- [ ] Battle-test with real bots
- [ ] Public changelog
- [x] npm publish
