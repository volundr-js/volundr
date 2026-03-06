import type { Snowflake } from "@volundr/types";

/**
 * Options for paginated REST requests.
 */
export interface PaginateOptions {
    /** Maximum items per page (default: 100). */
    limit?: number;
    /** Snowflake ID to start after. */
    after?: Snowflake;
    /** Snowflake ID to start before. */
    before?: Snowflake;
}

/**
 * Creates an async iterator that paginates through a REST endpoint.
 *
 * @param fetchPage - Function that fetches a single page, receiving { limit, after }.
 * @param options - Pagination options.
 *
 * @example
 * ```ts
 * for await (const members of paginate(
 *   (opts) => client.listMembers(guildId, opts),
 *   { limit: 100 }
 * )) {
 *   console.log(members.length); // up to 100 per page
 * }
 * ```
 */
export async function* paginate<T extends { id: Snowflake }>(
    fetchPage: (options: { limit: number; after?: Snowflake }) => Promise<T[]>,
    options: PaginateOptions = {},
): AsyncGenerator<T[], void, unknown> {
    const limit = options.limit ?? 100;
    let after = options.after;

    while (true) {
        const page = await fetchPage({ limit, after });
        if (page.length === 0) break;

        yield page;

        if (page.length < limit) break;
        after = page[page.length - 1]!.id;
    }
}

/**
 * Convenience: collect all pages into a single flat array.
 */
export async function paginateAll<T extends { id: Snowflake }>(
    fetchPage: (options: { limit: number; after?: Snowflake }) => Promise<T[]>,
    options: PaginateOptions = {},
): Promise<T[]> {
    const results: T[] = [];
    for await (const page of paginate(fetchPage, options)) {
        results.push(...page);
    }
    return results;
}
