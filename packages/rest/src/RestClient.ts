import { Logger } from "@volundr/logger";
import type { RestClientOptions, RequestOptions, InternalRequest, HttpMethod } from "./types.js";
import { DISCORD_API_BASE, DEFAULT_API_VERSION, DEFAULT_MAX_RETRIES } from "./types.js";
import { RateLimiter } from "./RateLimiter.js";
import { RequestQueue } from "./RequestQueue.js";
import { RequestExecutor } from "./RequestExecutor.js";
import { computeBucketKey } from "./BucketKey.js";

const log = Logger.getLogger("rest", "RestClient");

export class RestClient {
    private readonly baseUrl: string;
    private readonly rateLimiter: RateLimiter;
    private readonly queue: RequestQueue;
    private readonly executor: RequestExecutor;

    constructor(options: RestClientOptions) {
        const version = options.apiVersion ?? DEFAULT_API_VERSION;
        this.baseUrl = `${options.baseUrl ?? DISCORD_API_BASE}/v${version}`;

        this.rateLimiter = new RateLimiter();
        this.queue = new RequestQueue(this.rateLimiter);
        this.executor = new RequestExecutor(
            options.token,
            this.rateLimiter,
            options.maxRetries ?? DEFAULT_MAX_RETRIES,
        );

        log.info(`Initialized (API v${version})`);
    }

    get<T>(route: string, options: RequestOptions = {}): Promise<T> {
        return this.request<T>("GET", route, options);
    }

    post<T>(route: string, options: RequestOptions = {}): Promise<T> {
        return this.request<T>("POST", route, options);
    }

    put<T>(route: string, options: RequestOptions = {}): Promise<T> {
        return this.request<T>("PUT", route, options);
    }

    patch<T>(route: string, options: RequestOptions = {}): Promise<T> {
        return this.request<T>("PATCH", route, options);
    }

    delete<T>(route: string, options: RequestOptions = {}): Promise<T> {
        return this.request<T>("DELETE", route, options);
    }

    exportBucketMap(): Map<string, string> {
        return this.rateLimiter.exportBucketMap();
    }

    importBucketMap(map: Map<string, string>): void {
        this.rateLimiter.importBucketMap(map);
    }

    private request<T>(method: HttpMethod, route: string, options: RequestOptions): Promise<T> {
        const bucketKey = computeBucketKey(method, route);
        const url = `${this.baseUrl}${route}`;

        const internal: InternalRequest = { method, route, bucketKey, url, options };

        return this.queue.enqueue<T>(
            internal,
            (req) => this.executor.execute(req) as Promise<T>,
        );
    }
}
