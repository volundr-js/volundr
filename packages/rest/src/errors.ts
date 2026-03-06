export class DiscordAPIError extends Error {
    readonly name = "DiscordAPIError";

    constructor(
        readonly status: number,
        readonly code: number,
        message: string,
        readonly errors: Record<string, unknown> | undefined,
        readonly method: string,
        readonly route: string,
    ) {
        super(`[${code}] ${message}`);
    }
}

export class HTTPError extends Error {
    readonly name = "HTTPError";

    constructor(
        readonly status: number,
        readonly method: string,
        readonly route: string,
    ) {
        super(`HTTP ${status} on ${method} ${route}`);
    }
}
