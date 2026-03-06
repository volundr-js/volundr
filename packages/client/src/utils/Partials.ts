/**
 * Partials enum - specifies which entity types can be received as partial (uncached) data.
 *
 * When a partial type is enabled, events may emit entities with only an ID and
 * `partial: true`. Call `.fetch()` on partial entities to hydrate them fully.
 *
 * Without partials enabled for a type, events for uncached entities of that type
 * are silently dropped (discord.js behavior).
 */
export const Partials = {
    /** Allow partial User entities. */
    User: 0,
    /** Allow partial Channel entities. */
    Channel: 1,
    /** Allow partial GuildMember entities. */
    GuildMember: 2,
    /** Allow partial Message entities. */
    Message: 3,
    /** Allow partial Reaction entities. */
    Reaction: 4,
    /** Allow partial ThreadMember entities. */
    ThreadMember: 5,
} as const;

export type PartialType = (typeof Partials)[keyof typeof Partials];

/** Check whether a specific partial type is enabled. */
export function hasPartial(enabled: PartialType[], type: PartialType): boolean {
    return enabled.includes(type);
}
