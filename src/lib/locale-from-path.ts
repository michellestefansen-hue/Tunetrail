import { hasLocale } from "next-intl";
import { routing, type Locale } from "@/i18n/routing";

/**
 * /logg-inn has no locale segment of its own -- it's reached both from the
 * multilingual /foresla/<locale>/... flow and from the always-Norwegian
 * /admin redirect, so its language has to be inferred from where you were
 * headed. /foresla/<locale>/... carries it; /admin does not, and defaults to
 * Norwegian, which is correct since only the site's own moderator lands there.
 */
export function localeFromNeste(neste: string | null | undefined): Locale {
  if (neste?.startsWith("/foresla/")) {
    const candidate = neste.split("/")[2];
    if (hasLocale(routing.locales, candidate)) return candidate;
  }
  return routing.defaultLocale;
}
