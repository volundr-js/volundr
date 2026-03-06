export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface RestClientOptions {
    token: string;
    apiVersion?: number;
    baseUrl?: string;
    maxRetries?: number;
}

import type { FileAttachment } from "./FormDataBuilder.js";

export interface RequestOptions {
    body?: unknown;
    files?: FileAttachment[];
    query?: Record<string, string>;
    reason?: string;
    headers?: Record<string, string>;
}

export interface InternalRequest {
    method: HttpMethod;
    route: string;
    bucketKey: string;
    url: string;
    options: RequestOptions;
}

export interface BucketState {
    bucketHash: string | null;
    remaining: number;
    limit: number;
    resetAt: number;
    resetAfter: number;
}

export interface DiscordErrorData {
    code: number;
    message: string;
    errors?: Record<string, unknown>;
}

export interface RateLimitData {
    message: string;
    retry_after: number;
    global: boolean;
}

export const DISCORD_API_BASE = "https://discord.com/api";
export const DEFAULT_API_VERSION = 10;
export const DEFAULT_MAX_RETRIES = 3;
