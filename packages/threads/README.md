# @volundr/threads

Worker thread pool for Volundr's multi-core sharding. More memory-efficient than process-based sharding.

## Install

```bash
npm install @volundr/threads
```

## Usage

Used internally by `@volundr/gateway` for worker thread sharding. Each shard runs in its own worker thread, sharing the same process memory for common data.

```typescript
import { ThreadPool } from "@volundr/threads";

const pool = new ThreadPool({
    workerScript: "./worker.js",
    size: 4,
});

await pool.start();
```

## Part of [Volundr](https://www.npmjs.com/org/volundr)

Most bots should use `@volundr/client` with `shardCount: "auto"` instead of using this directly.

## License

ISC
