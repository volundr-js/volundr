const MAJOR_PARAMS = new Set(["channels", "guilds", "webhooks"]);
const SNOWFLAKE_RE = /^\d{16,20}$/;
const bucketKeyCache = new Map<string, string>();

export function computeBucketKey(method: string, route: string): string {
    const cacheKey = method + route;
    const cached = bucketKeyCache.get(cacheKey);
    if (cached) return cached;

    const segments = route.split("/").filter(Boolean);
    const normalized: string[] = [];

    for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];

        if (SNOWFLAKE_RE.test(segment)) {
            const prev = segments[i - 1];
            if (prev && MAJOR_PARAMS.has(prev)) {
                normalized.push(segment);
            } else {
                normalized.push(":id");
            }
        } else {
            normalized.push(segment);
        }
    }

    const result = `${method}:/${normalized.join("/")}`;
    bucketKeyCache.set(cacheKey, result);
    return result;
}
