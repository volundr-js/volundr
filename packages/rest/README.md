# @volundr/rest

Discord REST API client with automatic rate limiting, retries, and file uploads.

## Install

```bash
npm install @volundr/rest
```

## Usage

```typescript
import { RestClient } from "@volundr/rest";

const rest = new RestClient({ token: process.env.DISCORD_TOKEN! });

// GET
const user = await rest.get("/users/@me");

// POST with JSON body
await rest.post("/channels/123/messages", {
    body: { content: "Hello!" },
});

// PATCH with reason header
await rest.patch("/guilds/123", {
    body: { name: "New Name" },
    reason: "Rebranding",
});

// File uploads
await rest.post("/channels/123/messages", {
    body: { content: "Check this out" },
    files: [{ name: "image.png", data: buffer }],
});
```

## Features

- Automatic rate limit handling (per-route buckets + global)
- Retry on 429 and 5xx with exponential backoff
- File uploads via multipart/form-data
- Audit log reason headers
- Queue-based request execution

## Part of [Volundr](https://www.npmjs.com/org/volundr)

Most bots should use `@volundr/client` which includes REST automatically.

## License

ISC
