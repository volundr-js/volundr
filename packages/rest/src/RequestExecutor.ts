import { Logger } from "@volundr/logger";
import { RateLimiter } from "./RateLimiter.js";
import type { InternalRequest, DiscordErrorData, RateLimitData } from "./types.js";
import { DEFAULT_MAX_RETRIES } from "./types.js";
import { DiscordAPIError, HTTPError } from "./errors.js";
import { buildFormData } from "./FormDataBuilder.js";

const log = Logger.getLogger("rest", "Executor");

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export class RequestExecutor {
    private readonly baseHeaders: Record<string, string>;

    constructor(
        private readonly token: string,
        private readonly rateLimiter: RateLimiter,
        private readonly maxRetries: number = DEFAULT_MAX_RETRIES,
    ) {
        this.baseHeaders = {
            "Authorization": `Bot ${token}`,
            "User-Agent": "DiscordBot (volundr, 1.0.0)",
        };
    }

    async execute(request: InternalRequest): Promise<unknown> {
        let retries = 0;
        const { method, url, options } = request;

        // Build headers once outside the retry loop
        const headers: Record<string, string> = options.headers
            ? { ...this.baseHeaders, ...options.headers }
            : { ...this.baseHeaders };

        if (options.reason) {
            headers["X-Audit-Log-Reason"] = encodeURIComponent(options.reason);
        }

        let queryString = "";
        if (options.query) {
            queryString = "?" + new URLSearchParams(options.query).toString();
        }

        const fetchUrl = queryString ? url + queryString : url;

        // Build body once outside the retry loop
        let fetchBody: BodyInit | undefined;
        if (options.files && options.files.length > 0) {
            fetchBody = buildFormData(options.body, options.files);
        } else if (options.body !== undefined) {
            headers["Content-Type"] = "application/json";
            fetchBody = JSON.stringify(options.body);
        }

        while (true) {
            log.debug(() => `${method} ${request.route}`);

            const response = await fetch(fetchUrl, {
                method,
                headers,
                body: fetchBody,
            });

            this.rateLimiter.updateFromHeaders(request.bucketKey, response.headers);

            // 2xx
            if (response.ok) {
                if (response.status === 204) return undefined;
                return response.json();
            }

            // 429
            if (response.status === 429) {
                retries++;
                if (retries >= this.maxRetries) {
                    throw new HTTPError(response.status, method, request.route);
                }

                const data: RateLimitData = await response.json() as RateLimitData;

                if (data.global) {
                    this.rateLimiter.setGlobalLimit(data.retry_after);
                }

                log.warn(
                    `Rate limited on ${method} ${request.route} ` +
                    `(${data.global ? "global" : "bucket"}), retry ${retries}/${this.maxRetries} after ${data.retry_after}s`
                );

                await sleep(data.retry_after * 1000);
                continue;
            }

            // 4xx
            if (response.status >= 400 && response.status < 500) {
                const data = await response.json().catch(() => ({
                    code: response.status,
                    message: response.statusText,
                })) as DiscordErrorData;

                throw new DiscordAPIError(
                    response.status,
                    data.code,
                    data.message,
                    data.errors,
                    method,
                    request.route,
                );
            }

            // 5xx
            retries++;
            if (retries >= this.maxRetries) {
                throw new HTTPError(response.status, method, request.route);
            }

            const backoff = Math.min(1000 * 2 ** retries, 30_000);
            log.warn(`Server error ${response.status} on ${method} ${request.route}, retry ${retries}/${this.maxRetries} in ${backoff}ms`);
            await sleep(backoff);
        }
    }
}
