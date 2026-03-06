import { Logger } from "@volundr/logger";
import { RateLimiter } from "./RateLimiter.js";
import type { InternalRequest } from "./types.js";

const log = Logger.getLogger("rest", "RequestQueue");

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

interface RequestTask<T> {
    request: InternalRequest;
    execute: (req: InternalRequest) => Promise<T>;
    resolve: (value: T) => void;
    reject: (reason: unknown) => void;
}

export class RequestQueue {
    private queues = new Map<string, RequestTask<unknown>[]>();
    private processing = new Set<string>();

    constructor(private readonly rateLimiter: RateLimiter) {}

    enqueue<T>(
        request: InternalRequest,
        execute: (req: InternalRequest) => Promise<T>,
    ): Promise<T> {
        return new Promise<T>((resolve, reject) => {
            const task: RequestTask<T> = { request, execute, resolve, reject };
            const key = request.bucketKey;

            if (!this.queues.has(key)) {
                this.queues.set(key, []);
            }
            this.queues.get(key)!.push(task as RequestTask<unknown>);

            if (!this.processing.has(key)) {
                this.processQueue(key);
            }
        });
    }

    private async processQueue(bucketKey: string): Promise<void> {
        if (this.processing.has(bucketKey)) return;
        this.processing.add(bucketKey);

        const queue = this.queues.get(bucketKey);

        try {
            let readIdx = 0;
            while (queue && readIdx < queue.length) {
                // Combine global + route waits into a single sleep
                const wait = Math.max(
                    this.rateLimiter.getGlobalWaitTime(),
                    this.rateLimiter.getRouteWaitTime(bucketKey),
                );
                if (wait > 0) {
                    log.debug(() => `Rate limited on ${bucketKey}, waiting ${wait}ms`);
                    await sleep(wait);
                }

                const task = queue[readIdx++];
                try {
                    const result = await task.execute(task.request);
                    task.resolve(result);
                } catch (error) {
                    task.reject(error);
                }
            }
        } finally {
            this.processing.delete(bucketKey);
            this.queues.delete(bucketKey);
        }
    }
}
