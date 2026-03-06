import type { LocaleString } from "@volundr/types";

/**
 * Translation entries: each key maps to an object with locale → string.
 * The `en-US` key is required as the fallback locale.
 */
export type LocaleMap<K extends string = string> = Record<
    K,
    Partial<Record<LocaleString, string>> & { "en-US": string }
>;

/**
 * Create a type-safe locale resolver from a translations map.
 *
 * @example
 * ```ts
 * const t = createLocaleMap({
 *     now_playing: {
 *         "en-US": "Now Playing",
 *         "pt-BR": "Tocando Agora",
 *         "es-ES": "Reproduciendo",
 *     },
 *     queue_empty: {
 *         "en-US": "The queue is empty.",
 *         "pt-BR": "A fila está vazia.",
 *     },
 * });
 *
 * t("now_playing", interaction.locale); // "Tocando Agora" if pt-BR
 * ```
 */
export function createLocaleMap<K extends string>(
    translations: LocaleMap<K>,
): (key: K, locale: LocaleString | string) => string {
    return (key, locale) => {
        const entry = translations[key];
        if (!entry) return key;
        return (entry as Record<string, string>)[locale] ?? entry["en-US"];
    };
}

/**
 * Resolve a single localized string with fallback to en-US.
 *
 * @example
 * ```ts
 * const greeting = resolveLocale({
 *     "en-US": "Hello!",
 *     "pt-BR": "Olá!",
 * }, interaction.locale);
 * ```
 */
export function resolveLocale(
    map: Partial<Record<LocaleString, string>> & { "en-US": string },
    locale: LocaleString | string,
): string {
    return (map as Record<string, string>)[locale] ?? map["en-US"];
}
