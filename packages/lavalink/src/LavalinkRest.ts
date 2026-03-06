import { Logger } from "@volundr/logger";
import type { Snowflake } from "@volundr/types";
import type {
    LoadResult, LavalinkPlayerData, UpdatePlayerOptions,
    LavalinkInfo, LavalinkStatsPayload,
} from "./types.js";

const log = Logger.getLogger("lavalink", "Rest");

const MAX_RETRIES = 3;
const RETRY_BASE_MS = 500;
const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);

export class LavalinkRest {
    private readonly baseUrl: string;
    private readonly headers: Record<string, string>;

    constructor(
        host: string,
        port: number,
        password: string,
        secure: boolean,
        userId: Snowflake,
        clientName: string,
    ) {
        const protocol = secure ? "https" : "http";
        this.baseUrl = `${protocol}://${host}:${port}`;
        this.headers = {
            "Authorization": password,
            "User-Id": userId,
            "Client-Name": clientName,
            "Content-Type": "application/json",
        };
    }

    // --- Track Loading ---

    async loadTracks(identifier: string): Promise<LoadResult> {
        return this.get<LoadResult>(`/v4/loadtracks?identifier=${encodeURIComponent(identifier)}`);
    }

    async decodeTracks(encodedTracks: string[]): Promise<{ encoded: string; info: unknown }[]> {
        return this.post(`/v4/decodetracks`, encodedTracks);
    }

    // --- Player Management ---

    async getPlayers(sessionId: string): Promise<LavalinkPlayerData[]> {
        return this.get<LavalinkPlayerData[]>(`/v4/sessions/${sessionId}/players`);
    }

    async getPlayer(sessionId: string, guildId: Snowflake): Promise<LavalinkPlayerData> {
        return this.get<LavalinkPlayerData>(`/v4/sessions/${sessionId}/players/${guildId}`);
    }

    async updatePlayer(
        sessionId: string,
        guildId: Snowflake,
        data: UpdatePlayerOptions,
        noReplace = false,
    ): Promise<LavalinkPlayerData> {
        const query = noReplace ? "?noReplace=true" : "";
        return this.patch<LavalinkPlayerData>(
            `/v4/sessions/${sessionId}/players/${guildId}${query}`,
            data,
        );
    }

    async destroyPlayer(sessionId: string, guildId: Snowflake): Promise<void> {
        await this.delete(`/v4/sessions/${sessionId}/players/${guildId}`);
    }

    // --- Session ---

    async updateSession(sessionId: string, data: { resuming?: boolean; timeout?: number }): Promise<void> {
        await this.patch(`/v4/sessions/${sessionId}`, data);
    }

    // --- Info ---

    async getInfo(): Promise<LavalinkInfo> {
        return this.get<LavalinkInfo>("/v4/info");
    }

    async getStats(): Promise<LavalinkStatsPayload> {
        return this.get<LavalinkStatsPayload>("/v4/stats");
    }

    async getVersion(): Promise<string> {
        return this.get<string>("/version");
    }

    // --- HTTP Methods ---

    private async request(method: string, path: string, body?: string): Promise<Response> {
        const url = `${this.baseUrl}${path}`;

        for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
            log.debug(`${method} ${path}${attempt > 0 ? ` (retry ${attempt})` : ""}`);

            let res: Response;
            try {
                res = await fetch(url, {
                    method,
                    headers: this.headers,
                    body,
                });
            } catch (err) {
                if (attempt < MAX_RETRIES) {
                    const delay = RETRY_BASE_MS * 2 ** attempt;
                    log.warn(`${method} ${path} failed (${err}), retrying in ${delay}ms`);
                    await new Promise((r) => setTimeout(r, delay));
                    continue;
                }
                throw err;
            }

            if (res.ok) return res;

            if (RETRYABLE_STATUSES.has(res.status) && attempt < MAX_RETRIES) {
                const delay = RETRY_BASE_MS * 2 ** attempt;
                log.warn(`${method} ${path} → ${res.status}, retrying in ${delay}ms`);
                await new Promise((r) => setTimeout(r, delay));
                continue;
            }

            let errorBody = "";
            try { errorBody = await res.text(); } catch {}
            if (method === "PATCH") {
                log.error(`PATCH ${path} → ${res.status}: ${errorBody} | sent: ${body}`);
            }
            throw new Error(`Lavalink REST ${res.status} on ${method} ${path}: ${errorBody}`);
        }

        throw new Error(`Lavalink REST: max retries exceeded for ${method} ${path}`);
    }

    private async get<T>(path: string): Promise<T> {
        const res = await this.request("GET", path);
        return res.json() as Promise<T>;
    }

    private async post<T>(path: string, body?: unknown): Promise<T> {
        const res = await this.request("POST", path, body !== undefined ? JSON.stringify(body) : undefined);
        return res.json() as Promise<T>;
    }

    private async patch<T>(path: string, body?: unknown): Promise<T> {
        const res = await this.request("PATCH", path, body !== undefined ? JSON.stringify(body) : undefined);
        if (res.status === 204) return undefined as T;
        return res.json() as Promise<T>;
    }

    private async delete(path: string): Promise<void> {
        await this.request("DELETE", path);
    }
}
