# @volundr/logger

Structured, colored logger used across all Volundr packages. Logback-style formatting with level filtering.

## Install

```bash
npm install @volundr/logger
```

## Usage

```typescript
import { getLogger, setLevel, LogLevel } from "@volundr/logger";

const log = getLogger("myapp", "Server");

log.info("Started on port", 3000);
log.debug("Connection details", { host: "localhost" });
log.warn("Slow query detected");
log.error("Failed to connect", err);

// Set global log level
setLevel(LogLevel.DEBUG);
```

Output:
```
[14:32:01] [INFO ] myapp / Server        | Started on port 3000
[14:32:01] [DEBUG] myapp / Server        | Connection details { host: 'localhost' }
```

## Log Levels

`TRACE` < `DEBUG` < `INFO` < `WARN` < `ERROR` < `OFF`

## Part of [Volundr](https://www.npmjs.com/org/volundr)

## License

ISC
